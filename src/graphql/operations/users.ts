import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'users');

  const fields = {
    id: ['evmAddress', 'starknetAddress'],
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
      COALESCE(SUM(l.vote_count), 0) as votesCount,
      COALESCE(SUM(l.proposal_count), 0) as proposalsCount,
      MAX(l.last_vote) as lastVote
    FROM users u
    LEFT JOIN leaderboard l ON l.user = u.id
    WHERE 1=1 ${queryStr}
    GROUP BY u.id
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    const users = await db.queryAsync(query, params);

    return users.map(formatUser);
  } catch (e: any) {
    log.error(`[graphql] users, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
