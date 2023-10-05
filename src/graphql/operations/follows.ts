import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatFollow } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'follows');

  const fields = {
    id: 'string',
    ipfs: 'string',
    follower: 'string',
    space: 'string',
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

  const query = `
    SELECT f.*, spaces.settings FROM follows f
    INNER JOIN spaces ON spaces.id = f.space
    WHERE spaces.settings IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);

  let follows: any[] = [];
  try {
    follows = await db.queryAsync(query, params);
    return follows.map(follow => formatFollow(follow));
  } catch (e: any) {
    log.error(`[graphql] follows, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
