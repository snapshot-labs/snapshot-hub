import graphqlFields from 'graphql-fields';
import db from '../../helpers/mysql';
import { buildWhereQuery, formatProposal, formatVote } from '../helpers';

export default async function(parent, args, context, info) {
  const requestedFields = graphqlFields(info);
  const { where = {} } = args;

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    voter: 'string',
    proposal: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'v', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const { first = 20, skip = 0 } = args;
  params.push(skip, first);

  let votes: any[] = [];

  const query = `SELECT * FROM votes WHERE 1=1 ${queryStr}
   GROUP BY voter, proposal ORDER BY created DESC, ${orderBy} ${orderDirection} LIMIT ?, ?`;

  try {
    votes = await db.queryAsync(query, params);
    votes = votes.map(vote => formatVote(vote));
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
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
      console.log(e);
      return Promise.reject('request failed');
    }
  }

  return votes;
}
