import db from '../../helpers/mysql';
import { buildWhereQuery } from '../helpers';

export default async function(parent, args) {
  const { where = {} } = args;

  const fields = {
    id: 'string',
    ipfs: 'string',
    follower: 'string',
    wallet: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'f', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `f.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 1000) first = 1000;
  params.push(skip, first);

  const query = `
    SELECT f.* FROM walletFollows f
    WHERE 1 = 1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    const walletFollows = await db.queryAsync(query, params);
    return walletFollows;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
