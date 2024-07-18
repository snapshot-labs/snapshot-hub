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
  const ids = (where.id_in || [where.id]).filter(Boolean);
  if (Object.keys(where).length > 1) ids.length = 0;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `u.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT
      u.*
    FROM users u
    WHERE 1=1 ${queryStr}
    GROUP BY u.id
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    const users = await db.queryAsync(query, params);
    ids.forEach(element => {
      if (!users.find((u: any) => u.id === element)) {
        users.push({ id: element });
      }
    });
    if (!users.length) return [];

    const counts = await db.queryAsync(`
      SELECT
        user,
        SUM(vote_count) as votesCount,
        SUM(proposal_count) as proposalsCount,
        MAX(last_vote) as lastVote
      FROM leaderboard
      WHERE user IN (${users.map((u: any) => `'${u.id}'`).join(',')})
      GROUP BY user
    `);
    counts.forEach((count: any) => {
      const user = users.find((u: any) => u.id === count.user);
      if (user) {
        user.votesCount = count.votesCount;
        user.proposalsCount = count.proposalsCount;
        user.lastVote = count.lastVote;
      }
    });
    return users.map(formatUser);
  } catch (e: any) {
    log.error(`[graphql] users, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
