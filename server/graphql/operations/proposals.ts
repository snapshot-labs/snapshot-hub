import db from '../../helpers/mysql';
import { formatProposal } from '../helpers';

export default async function(parent, args) {
  const { where = {} } = args;
  const ts = parseInt((Date.now() / 1e3).toFixed());
  let queryStr = '';
  const params: any[] = [];

  const space = where.space || null;
  if (space) {
    queryStr += `AND p.space = ? `;
    params.push(space);
  }

  const spaceIn = where.space_in || [];
  if (spaceIn.length > 0) {
    queryStr += `AND p.space IN (?) `;
    params.push(spaceIn);
  }

  const id = where.id || null;
  if (id) {
    queryStr += `AND p.id = ? `;
    params.push(id);
  }

  const idIn = where.id_in || [];
  if (idIn.length > 0) {
    queryStr += `AND p.id IN (?)`;
    params.push(idIn);
  }

  const state = where.state || null;
  if (state === 'pending') {
    queryStr += 'AND p.start > ? ';
    params.push(ts);
  } else if (state === 'active') {
    queryStr += 'AND p.start < ? AND p.end > ? ';
    params.push(ts, ts);
  } else if (state === 'closed') {
    queryStr += 'AND p.end < ? ';
    params.push(ts);
  }

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'start', 'end'].includes(orderBy)) orderBy = 'created';
  orderBy = `p.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const { first = 20, skip = 0 } = args;
  params.push(skip, first);

  const query = `
    SELECT p.*, spaces.settings FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE spaces.settings IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    const proposals = await db.queryAsync(query, params);
    return proposals.map(proposal => formatProposal(proposal));
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
  }
}
