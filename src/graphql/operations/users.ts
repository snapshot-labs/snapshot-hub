import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

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

  const query = `
    SELECT
      u.*,
      SUM(leaderboard.vote_count) as votesCount,
      SUM(leaderboard.proposal_count) as proposalsCount
    FROM users u
    INNER JOIN leaderboard ON leaderboard.user = u.id
    WHERE 1=1 ${queryStr}
    GROUP BY leaderboard.user
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    const users = await db.queryAsync(query, params);
    return users.map(user => formatUser(user));
  } catch (e: any) {
    log.error(`[graphql] users, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
