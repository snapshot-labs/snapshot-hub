import db from '../../helpers/mysql';
import { formatVote } from '../helpers';

export default async function(parent, { id }) {
  const query = `
    SELECT v.*, spaces.settings FROM votes v
    INNER JOIN spaces ON spaces.id = v.space
    WHERE v.id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  try {
    const votes = await db.queryAsync(query, [id]);
    return votes.map(vote => formatVote(vote))[0] || null;
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
  }
}
