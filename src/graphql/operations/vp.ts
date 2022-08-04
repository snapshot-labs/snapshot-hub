import snapshot from '@snapshot-labs/snapshot.js';
import db from '../../helpers/mysql';

export default async function (_parent, { voter, space, proposal }) {
  if (proposal) {
    const query = `SELECT * FROM proposals WHERE id = ?`;
    const [p] = await db.queryAsync(query, [proposal]);

    return await snapshot.utils.getVp(
      voter,
      p.network,
      JSON.parse(p.strategies),
      p.snapshot,
      space,
      p.delegation === 1
    );
  } else if (space) {
    const query = `SELECT settings FROM spaces WHERE id = ? LIMIT 1`;
    let [s] = await db.queryAsync(query, [space]);
    s = JSON.parse(s.settings);

    return await snapshot.utils.getVp(
      voter,
      s.network,
      s.strategies,
      'latest',
      space,
      s.delegation === 1
    );
  }

  return Promise.reject('missing argument');
}
