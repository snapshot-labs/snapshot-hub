import db from '../../helpers/mysql';
import { buildWhereQuery, formatUser } from '../helpers';

export default async function(parent, args) {
  const { where = {} } = args;

  const fields = {
    id: 'string',
    ipfs: 'string',
    address: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'u', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `u.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 1000) first = 1000;
  params.push(skip, first);

  let users: any[] = [];

  const query = `
    SELECT u.* FROM users u
    WHERE 1=1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    users = await db.queryAsync(query, params);
    return users.map(user => formatUser(user));
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
