import db from '../../helpers/mysql';
import { formatSpace } from '../helpers';

export default async function (_parent, { id, domain }) {
  if (id && domain) {
    throw new Error('Identifier can either be id or domain but not both.');
  }
  const query = `
    SELECT s.* FROM spaces s
    WHERE s.${domain ? 'domain' : 'id'} = ? AND s.settings IS NOT NULL
    GROUP BY s.id
    LIMIT 1
  `;
  try {
    const spaces = await db.queryAsync(query, [id || domain]);
    return (
      spaces.map(space =>
        Object.assign(space, formatSpace(space.id, space.settings))
      )[0] || null
    );
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
