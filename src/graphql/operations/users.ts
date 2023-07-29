import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'users');

  const fields = {
    id: 'string',
    ipfs: 'string',
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

  let users: any[] = [];

  const query = `
    SELECT u.* FROM users u
    WHERE 1=1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    users = await db.queryAsync(query, params);
    return users.map(user => formatUser(user));
  } catch (e: any) {
    log.error(`[graphql] users, ${JSON.stringify(e)}`);
    capture(e);
    return Promise.reject('request failed');
  }
}
