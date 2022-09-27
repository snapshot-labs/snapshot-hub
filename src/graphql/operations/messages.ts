import db from '../../helpers/mysql';
import { buildWhereQuery } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, args) {
  const { where = {} } = args;

  const fields = {
    mci: 'number',
    timestamp: 'number',
    space: 'string',
    type: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 'm', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'timestamp';
  let orderDirection = args.orderDirection || 'desc';
  if (!['mci', 'timestamp'].includes(orderBy)) orderBy = 'mci';
  orderBy = `m.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 1000) first = 1000;
  params.push(skip, first);

  const query = `
    SELECT m.* FROM messages m
    WHERE id IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    return await db.queryAsync(query, params);
  } catch (e) {
    log.error('[graphql] messages', e);
    return Promise.reject('request failed');
  }
}
