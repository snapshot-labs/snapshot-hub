import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatUser } from '../helpers';

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
      u.*,
      COALESCE(SUM(l.vote_count), 0)  as votesCount,
      COALESCE(SUM(l.proposal_count), 0) as proposalsCount,
      MAX(l.last_vote) as lastVote
    FROM users u
    LEFT JOIN leaderboard l ON l.user = u.id
    WHERE 1=1 ${queryStr}
    GROUP BY u.id
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  const users = await db.queryAsync(query, params);
  ids.forEach(element => {
    if (!users.find((u: any) => u.id === element)) {
      users.push({ id: element });
    }
  });
  if (!users.length) return [];

  const usersWithOutCreated = users
    .filter((u: any) => !u.created)
    .map((u: any) => u.id);
  if (usersWithOutCreated.length) {
    const counts = await db.queryAsync(
      `
      SELECT
        user,
        COALESCE(SUM(vote_count), 0) as votesCount,
        COALESCE(SUM(proposal_count) ,0) as proposalsCount,
        MAX(last_vote) as lastVote
      FROM leaderboard
      WHERE user IN (?)
      GROUP BY user
    `,
      [usersWithOutCreated]
    );
    counts.forEach((count: any) => {
      const user = users.find((u: any) => u.id === count.user);
      user.votesCount = count.votesCount;
      user.proposalsCount = count.proposalsCount;
      user.lastVote = count.lastVote;
    });
  }
  return users.map(formatUser);
}
