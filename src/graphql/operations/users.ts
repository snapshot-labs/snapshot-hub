import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';
import log from '../../helpers/log';
import type { QueryArgs } from '../../types';

export default async function (parent: any, args: QueryArgs) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'users');

  const fields = {
    id: 'string',
    ipfs: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'u', where);
  const queryStr = whereQuery.query;
  const params = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `u.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT u.* FROM users u
    WHERE 1=1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    const users = await db.queryAsync(query, params);
    return users.map(user => formatUser(user));
  } catch (e) {
    log.error(`[graphql] users, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
