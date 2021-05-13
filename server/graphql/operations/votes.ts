import db from '../../helpers/mysql';
import { formatVote } from '../helpers';

export default async function(parent, args) {
  const { where = {} } = args;
  let queryStr = '';
  const params: any[] = [];

  const space = where.space || null;
  if (space) {
    queryStr += `AND v.space = ? `;
    params.push(space);
  }

  const spaceIn = where.space_in || [];
  if (spaceIn.length > 0) {
    queryStr += `AND v.space IN (?) `;
    params.push(spaceIn);
  }

  const id = where.id || null;
  if (id) {
    queryStr += `AND v.id = ? `;
    params.push(id);
  }

  const idIn = where.id_in || [];
  if (idIn.length > 0) {
    queryStr += `AND v.id IN (?)`;
    params.push(idIn);
  }

  const proposal = where.proposal || null;
  if (proposal) {
    queryStr += `AND v.proposal = ? `;
    params.push(proposal);
  }

  const proposalIn = where.proposal_in || [];
  if (proposalIn.length > 0) {
    queryStr += `AND v.proposal IN (?)`;
    params.push(proposalIn);
  }

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const { first = 20, skip = 0 } = args;
  params.push(skip, first);

  const query = `
    SELECT v.*, spaces.settings FROM votes v
    INNER JOIN spaces ON spaces.id = v.space
    WHERE spaces.settings IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    const votes = await db.queryAsync(query, params);
    return votes.map(vote => formatVote(vote));
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
  }
}
