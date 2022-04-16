import db from '../../helpers/mysql';
import { formatUser } from '../helpers';

export default async function(parent, args) {
  const address = args.address;

  const query = `
    SELECT u.* FROM users u
    WHERE address = ? 
  `;
  try {
    const users = await db.queryAsync(query, address);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
