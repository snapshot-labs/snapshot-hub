import graphqlFields from 'graphql-fields';
import db from '../../helpers/mysql';
import { formatProposal, formatVote } from '../helpers';

export default async function(parent, args, context, info) {
  const requestedFields = graphqlFields(info);
  const { where = {} } = args;
  let queryStr = '';
  const params: any[] = [];

  const fields = ['id', 'space', 'voter', 'proposal'];
  fields.forEach(field => {
    if (where[field]) {
      queryStr += `AND v.${field} = ? `;
      params.push(where[field]);
    }
    const fieldIn = where[`${field}_in`] || [];
    if (fieldIn.length > 0) {
      queryStr += `AND v.${field} IN (?) `;
      params.push(fieldIn);
    }
  });

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const { first = 20, skip = 0 } = args;
  params.push(skip, first);

  let votes: any[] = [];

  const query = `
    SELECT v.*, spaces.settings FROM votes v
    INNER JOIN spaces ON spaces.id = v.space
    LEFT OUTER JOIN votes v2 ON
      v.voter = v2.voter AND v.proposal = v2.proposal
      AND ((v.created < v2.created) OR (v.created = v2.created AND v.id < v2.id))
    WHERE v2.voter IS NULL AND spaces.settings IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
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
