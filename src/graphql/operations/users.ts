import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

const TABLE_ALIAS = 't';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'users');

  const fields = {
    id: 'EVMAddress',
    ipfs: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, TABLE_ALIAS, where, {
    aliases: { id: 'userId' }
  });
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `${TABLE_ALIAS}.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
  SELECT * FROM (
      SELECT
        u.*,
        u.id as userId,
        COALESCE(SUM(l.vote_count), 0) as votesCount,
        COALESCE(SUM(l.proposal_count), 0) as proposalsCount,
        MAX(l.last_vote) as lastVote
      FROM users u
      LEFT JOIN leaderboard l ON l.user = u.id
      GROUP BY u.id
      UNION
      SELECT
        u.*,
        l.user as userId,
        COALESCE(SUM(l.vote_count), 0) as votesCount,
        COALESCE(SUM(l.proposal_count), 0) as proposalsCount,
        MAX(l.last_vote) as lastVote
      FROM users u
      RIGHT JOIN leaderboard l ON l.user = u.id
      GROUP BY l.user
    ) AS ${TABLE_ALIAS}
    WHERE 1=1 ${queryStr}
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
