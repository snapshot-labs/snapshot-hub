import snapshot from '@snapshot-labs/snapshot.js';
import db from '../../helpers/mysql';
import { Space } from '../../types';

export default async function (
  parent: any,
  { voter, space, proposal }: { voter: any; space: string; proposal: string }
) {
  if (proposal) {
    const query = `SELECT * FROM proposals WHERE id = ?`;
    const [p] = await db.queryAsync(query, [proposal]);

    return await snapshot.utils.getVp(
      voter,
      p.network as string,
      JSON.parse(p.strategies as string),
      p.snapshot as number,
      space,
      p.delegation === 1
    );
  } else if (space) {
    const query = `SELECT settings FROM spaces WHERE id = ? AND deleted = 0 LIMIT 1`;
    const [s] = await db.queryAsync(query, [space]);
    const settings: Required<Pick<Space, 'network' | 'strategies'>> = JSON.parse(
      s.settings as string
    );

    return await snapshot.utils.getVp(
      voter,
      settings.network as string,
      settings.strategies,
      'latest',
      space,
      s.delegation === 1
    );
  }

  return Promise.reject('missing argument');
}
