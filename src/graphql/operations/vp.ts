import snapshot from '@snapshot-labs/snapshot.js';
import db from '../../helpers/mysql';

const scoreAPIUrl = process.env.SCORE_API_URL || 'https://score.snapshot.org';

export default async function (_parent, { voter, space, proposal }) {
  if (voter === '0x0000000000000000000000000000000000000000' || voter === '') {
    return Promise.reject(new Error('invalid address'));
  }

  if (proposal) {
    const query = `SELECT * FROM proposals WHERE id = ?`;
    const [p] = await db.queryAsync(query, [proposal]);

    return await snapshot.utils.getVp(
      voter,
      p.network,
      JSON.parse(p.strategies),
      p.snapshot,
      space,
      false,
      { url: scoreAPIUrl }
    );
  } else if (space) {
    const query = `SELECT settings FROM spaces WHERE id = ? AND deleted = 0 LIMIT 1`;
    let [s] = await db.queryAsync(query, [space]);
    s = JSON.parse(s.settings);

    return await snapshot.utils.getVp(voter, s.network, s.strategies, 'latest', space, false, {
      url: scoreAPIUrl
    });
  }

  return Promise.reject(new Error('missing argument'));
}
