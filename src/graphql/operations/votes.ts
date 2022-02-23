import graphqlFields from 'graphql-fields';
import db from '../../helpers/mysql';
import {
  buildWhereQuery,
  formatProposal,
  formatSpace,
  formatVote
} from '../helpers';
import serve from '../../helpers/ee';

async function query(parent, args, context?, info?) {
  const requestedFields = info ? graphqlFields(info) : {};
  const { where = {} } = args;

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    voter: 'string',
    proposal: 'string',
    created: 'number',
    vp: 'number',
    vp_state: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 'v', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'vp'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 30000) first = 30000;
  params.push(skip, first);

  let votes: any[] = [];

  const query = `
    SELECT v.* FROM votes v
    LEFT OUTER JOIN votes v2 ON
      v.voter = v2.voter AND v.proposal = v2.proposal
      AND ((v.created < v2.created) OR (v.created = v2.created AND v.id < v2.id))
    WHERE v2.voter IS NULL AND v.cb = 0 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    votes = await db.queryAsync(query, params);
    // TODO: we need settings in the vote as its being passed to formatSpace inside formatVote, Maybe we dont need to do this?
    votes = votes.map(vote => formatVote(vote));
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }

  if (requestedFields.space && votes.length > 0) {
    const spaceIds = votes
      .map(vote => vote.space.id)
      .filter((v, i, a) => a.indexOf(v) === i);
    const query = `
      SELECT id, settings FROM spaces
      WHERE id IN (?) AND settings IS NOT NULL
    `;
    try {
      let spaces = await db.queryAsync(query, [spaceIds]);

      spaces = Object.fromEntries(
        spaces.map(space => [space.id, formatSpace(space.id, space.settings)])
      );
      votes = votes.map(vote => {
        if (spaces[vote.space.id])
          return { ...vote, space: spaces[vote.space.id] };
        return vote;
      });
    } catch (e) {
      console.log('[graphql]', e);
      return Promise.reject('request failed');
    }
  }

  if (requestedFields.proposal && votes.length > 0) {
    const proposalIds = votes.map(vote => vote.proposal);
    const query = `
      SELECT p.*, spaces.settings FROM proposals p
      INNER JOIN spaces ON spaces.id = p.space
      WHERE spaces.settings IS NOT NULL AND p.id IN (?)
    `;
    try {
      let proposals = await db.queryAsync(query, [proposalIds]);
      proposals = Object.fromEntries(
        proposals.map(proposal => [proposal.id, formatProposal(proposal)])
      );
      votes = votes.map(vote => {
        vote.proposal = proposals[vote.proposal];
        return vote;
      });
    } catch (e) {
      console.log('[graphql]', e);
      return Promise.reject('request failed');
    }
  }

  return votes;
}

export default async function(parent, args, context?, info?) {
  const requestedFields = info ? graphqlFields(info) : {};
  return await serve(JSON.stringify({ args, requestedFields }), query, [
    parent,
    args,
    context,
    info
  ]);
}
