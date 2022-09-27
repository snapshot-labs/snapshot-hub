import db from '../../helpers/mysql';
import { formatUser } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, args) {
  const id = args.id;
  const query = `SELECT u.* FROM users u WHERE id = ? LIMIT 1`;
  try {
    const users = await db.queryAsync(query, id);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e) {
    log.error('[graphql] user', e);
    return Promise.reject('request failed');
  }
}
