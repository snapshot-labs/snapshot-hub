import db from '../../helpers/mysql';
import { formatSpace } from '../helpers';

export default async function(_parent, { id }) {
  const query = `
    SELECT s.*, COUNT(f.id) as followersCount FROM spaces s
    LEFT JOIN follows f ON f.space = s.id
    WHERE s.id = ? AND s.settings IS NOT NULL
    GROUP BY s.id
    LIMIT 1
  `;
  try {
    const spaces = await db.queryAsync(query, [id]);
    return (
      spaces.map(space =>
        Object.assign(space, formatSpace(space.id, space.settings, space.created_at, space.updated_at))
      )[0] || null
    );
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
