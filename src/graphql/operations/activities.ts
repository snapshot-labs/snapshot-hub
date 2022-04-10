import db from '../../helpers/mysql';
import { buildWhereQuery, formatProposal, formatVote } from '../helpers';
import mysql from 'mysql';

export default async function(parent, args) {
  const { where = {} } = args;

  const fields = {
    account: 'string',
    type: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'p', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderDirection = args.orderDirection || 'desc';
  const orderBy = `p.created`;
  orderDirection = orderDirection.toUpperCase();
  const { seek = 0 } = args;

  let seekWhere = '1 = 1';
  if (seek > 0) {
    seekWhere =
      orderDirection === 'DESC'
        ? `${orderBy} <= ${mysql.escape(seek)}`
        : `${orderBy} > ${mysql.escape(seek)}`;
  }

  params.push(10);
  // const { seek = {} } = args;
  // const getSeekWhere = (seek, activityType) => {
  //   let seekWhere = '1 = 1';
  //   const activitySeek = seek[activityType] ?? 0;
  //   if (activitySeek > 0) {
  //     seekWhere =
  //       orderDirection === 'DESC'
  //         ? `${orderBy} <= ${mysql.escape(activitySeek)}`
  //         : `${orderBy} > ${mysql.escape(activitySeek)}`;
  //   }
  //   return seekWhere;
  // };

  const proposalsQuery = () => `
    SELECT p.id, p.ipfs, p.author, p.title, p.created, spaces.settings FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE spaces.settings IS NOT NULL AND ${seekWhere} ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?
  `;

  const remainingProposalsQuery = () => `
    SELECT p.id, p.ipfs, p.author, p.title, p.created, spaces.settings FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE spaces.settings IS NOT NULL AND ${seekWhere} ${queryStr}
    ORDER BY ${orderBy} ${orderDirection}
  `;

  const votesQuery = () => `
    SELECT p.id, p.ipfs, p.voter, p.choice, p.created, spaces.settings FROM votes p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE spaces.settings IS NOT NULL AND ${seekWhere} ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?
  `;

  const remainingVotesQuery = () => `
  SELECT p.id, p.ipfs, p.voter, p.choice, p.created, spaces.settings FROM votes p
  INNER JOIN spaces ON spaces.id = p.space
  WHERE spaces.settings IS NOT NULL AND ${seekWhere} ${queryStr}
  ORDER BY ${orderBy} ${orderDirection}
  `;

  const fetchVotes = async query => {
    console.log(query);
    const votes = await db.queryAsync(query, params);
    return votes.map(vote => formatVote(vote));
  };

  const fetchProposals = async query => {
    console.log(query);
    const proposals = await db.queryAsync(query, params);
    return proposals.map(proposal => formatProposal(proposal));
  };

  try {
    let proposals = await fetchProposals(proposalsQuery());
    console.log('proposal', proposals.length);
    let votes = await fetchVotes(votesQuery());
    console.log('votes', votes.length);

    const lastRecordProposalTimestamp = proposals[proposals.length - 1].created;
    const lastRecordVoteTimestamp = votes[votes.length - 1].created;

    console.log({
      lastRecordProposalTimestamp,
      lastRecordVoteTimestamp
    });

    let newSeek = 0;
    if (orderDirection === 'DESC') {
      if (lastRecordProposalTimestamp < lastRecordVoteTimestamp) {
        console.log('DESC', 'Excess proposals');
        // fetch remaining votes upto last proposal Timestamp
        seekWhere = `${orderBy} <= ${mysql.escape(
          lastRecordVoteTimestamp
        )} AND ${orderBy} > ${mysql.escape(lastRecordProposalTimestamp)}`;

        const remainingVotes = await fetchVotes(remainingVotesQuery());
        console.log('remainingVotes', remainingVotes.length);
        votes = votes.concat(remainingVotes);
        newSeek = lastRecordProposalTimestamp;
      } else {
        console.log('DESC', 'Excess votes');
        // fetch remaining proposals upto last vote Timestamp
        seekWhere = `${orderBy} <= ${mysql.escape(
          lastRecordProposalTimestamp
        )} AND ${orderBy} > ${mysql.escape(lastRecordVoteTimestamp)}`;

        const remainingProposals = await fetchProposals(
          remainingProposalsQuery()
        );
        console.log('remainingProposals', remainingProposals.length);
        proposals = proposals.concat(remainingProposals);
        newSeek = lastRecordVoteTimestamp;
      }
    } else {
      if (lastRecordProposalTimestamp > lastRecordVoteTimestamp) {
        console.log('ASC', 'Excess proposals');
        // fetch remaining votes upto last proposal Timestamp
        seekWhere = `${orderBy} > ${mysql.escape(
          lastRecordVoteTimestamp
        )} AND ${orderBy} <= ${mysql.escape(lastRecordProposalTimestamp)}`;

        const remainingVotes = await fetchVotes(remainingVotesQuery());
        console.log('remainingVotes', remainingVotes.length);
        votes = votes.concat(remainingVotes);
        newSeek = lastRecordProposalTimestamp;
      } else {
        console.log('ASC', 'Excess votes');
        // fetch remaining proposals upto last vote Timestamp
        seekWhere = `${orderBy} > ${mysql.escape(
          lastRecordProposalTimestamp
        )} AND ${orderBy} <= ${mysql.escape(lastRecordVoteTimestamp)}`;

        const remainingProposals = await fetchProposals(
          remainingProposalsQuery()
        );
        console.log('remainingProposals', remainingProposals.length);
        proposals = proposals.concat(remainingProposals);
        newSeek = lastRecordVoteTimestamp;
      }
    }

    const activities = proposals
      .map(proposal => {
        return {
          account: proposal.author,
          type: 'proposal_created',
          created: proposal.created,
          payload: proposal
        };
      })
      .concat(
        votes.map(vote => {
          return {
            account: vote.voter,
            type: 'voted',
            created: vote.created,
            payload: vote
          };
        })
      )
      .sort((a, b) =>
        orderDirection === 'DESC'
          ? b.created - a.created
          : a.created - b.created
      );

    return {
      seek: newSeek,
      count: activities.length,
      activities
    };
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
