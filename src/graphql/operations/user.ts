import db from '../../helpers/mysql';
import { formatUser } from '../helpers';
import log from '../../helpers/log';
import { capture } from '../../helpers/sentry';

export default async function (parent, args) {
  const id = args.id;
  const query = `SELECT u.* FROM users u WHERE id = ? LIMIT 1`;
  try {
    const users = await db.queryAsync(query, id);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e: any) {
    log.error(`[graphql] user, ${JSON.stringify(e)}`);
    capture(e, { context: { id } });
    return Promise.reject('request failed');
  }
}
