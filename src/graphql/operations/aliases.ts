import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits } from '../helpers';
import log from '../../helpers/log';
import type { QueryArgs } from '../../types';

export default async function (parent: any, args: QueryArgs) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'aliases');

  const fields = {
    id: 'string',
    ipfs: 'string',
    address: 'string',
    alias: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'a', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `a.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT a.* FROM aliases a
    WHERE id IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);

  try {
    return await db.queryAsync(query, params);
  } catch (e) {
    log.error(`[graphql] aliases, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
