import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'users');

  const fields = { id: 'string', ipfs: 'string', created: 'number' };
  const leaderboardFields = { vote_count: 'number', proposal_count: 'number' };

  const whereQuery = buildWhereQuery(fields, 'u', where);
  const leaderboardWhereQuery = buildWhereQuery(leaderboardFields, 'l', where);
  const queryStr = [whereQuery.query, leaderboardWhereQuery.query].join(' ');
  const params = whereQuery.params.concat(
    leaderboardWhereQuery.params,
    skip,
    first
  );

  const query = `
    SELECT
      u.*,
      SUM(l.vote_count) AS vote_count,
      SUM(l.proposal_count) AS proposal_count
    FROM users u
    JOIN leaderboard l ON BINARY l.user = BINARY u.id
    WHERE 1=1 ${queryStr}
    GROUP BY u.id
    ORDER BY ${getOrderBy(args.orderBy)} ${getOrderDirection(
      args.orderDirection
    )}
    LIMIT ?, ?
  `;
  try {
    const users = await db.queryAsync(query, params);
    return users.map(formatUser);
  } catch (e: any) {
    log.error(`[graphql] users, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}

function getOrderDirection(direction: string | null) {
  const orderDirection = (direction ?? 'desc').toUpperCase();

  return ['ASC', 'DESC'].includes(orderDirection) ? orderDirection : 'DESC';
}

function getOrderBy(order: string | null | undefined) {
  const orderBy = (order ?? 'created').toLowerCase();

  return ['created', 'vote_count', 'proposal_count'].includes(orderBy)
    ? orderBy
    : 'created';
}
