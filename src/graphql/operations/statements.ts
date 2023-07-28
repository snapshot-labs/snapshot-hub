import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'statements');

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    created: 'number',
    delegate: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 's', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `s.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let statements: any[] = [];

  const query = `
    SELECT s.* FROM statements s
    WHERE 1=1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    statements = await db.queryAsync(query, params);
    return statements;
  } catch (e: any) {
    log.error(`[graphql] statements, ${JSON.stringify(e)}`);
    capture(e);
    return Promise.reject('request failed');
  }
}
