import db from '../../helpers/mysql';
import { buildWhereQuery } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  if (first > 1000) return Promise.reject('The `first` argument must not be greater than 1000');

  const fields = {
    id: 'string',
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

  const query = `
    SELECT m.* FROM messages m
    WHERE id IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    return await db.queryAsync(query, params);
  } catch (e) {
    log.error(`[graphql] messages, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
