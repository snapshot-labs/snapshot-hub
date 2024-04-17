import db from '../../helpers/mysql';
import { formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const id = args.id;
  const query = `
    SELECT
      u.*,
      SUM(leaderboard.vote_count) as vote_count,
      SUM(leaderboard.proposal_count) as proposal_count
    FROM users u
    INNER JOIN leaderboard ON leaderboard.user = u.id
    WHERE id = ?
    LIMIT 1`;
  try {
    const users = await db.queryAsync(query, id);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e: any) {
    log.error(`[graphql] user, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
