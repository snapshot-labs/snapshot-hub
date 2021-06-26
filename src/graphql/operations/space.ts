import db from '../../helpers/mysql';
import { formatSpace } from '../helpers';

export default async function(parent, { id }) {
  const query = `
    SELECT * FROM spaces
    WHERE id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  try {
    const spaces = await db.queryAsync(query, [id]);
    return (
      spaces.map(space => formatSpace(space.id, space.settings))[0] || null
    );
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
  }
}
