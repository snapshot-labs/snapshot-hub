import db from '../../helpers/mysql';
import { buildWhereQuery } from '../helpers';
import log from '../../helpers/log';

const FIRST_LIMIT = 1000;
const SKIP_LIMIT = 5000;

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  if (first > FIRST_LIMIT)
    return Promise.reject(`The \`first\` argument must not be greater than ${FIRST_LIMIT}`);
  if (skip > SKIP_LIMIT)
    return Promise.reject(`The \`skip\` argument must not be greater than ${SKIP_LIMIT}`);

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
