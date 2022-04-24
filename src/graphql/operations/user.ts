import db from '../../helpers/mysql';
import { formatUser } from '../helpers';

export default async function(parent, args) {
  const id = args.id;
  const query = `SELECT u.* FROM users u WHERE id = ? LIMIT 1`;
  try {
    const users = await db.queryAsync(query, id);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
