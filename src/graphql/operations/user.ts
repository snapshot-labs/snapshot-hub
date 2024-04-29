import db from '../../helpers/mysql';
import { formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const id = args.id;
  const query = `
    SELECT
      u.*,
      SUM(l.vote_count) as votesCount,
      SUM(l.proposal_count) as proposalsCount
    FROM users u
    INNER JOIN leaderboard l  ON BINARY l.user = BINARY u.id
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
