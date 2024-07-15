import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';
import log from '../../helpers/log';
import { formatUser, formatAddresses, PublicError } from '../helpers';

export default async function (parent, args) {
  const addresses = formatAddresses([args.id]);
  if (!addresses.length) throw new PublicError('Invalid address');
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
    ) AS t
    WHERE t.userId = ?
    LIMIT 1`;
  try {
    const users = await db.queryAsync(query, addresses[0]);

    if (!users.length) return null;

    return formatUser(users[0]);
  } catch (e: any) {
    log.error(`[graphql] user, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
