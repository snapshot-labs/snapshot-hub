import snapshot from '@snapshot-labs/snapshot.js';
import db from './mysql';
import { getSpaceENS } from './ens';
import { jsonParse } from './utils';

export async function addOrUpdateSpace(space: string, settings: any) {
  if (!settings || !settings.name) return false;
  const ts = (Date.now() / 1e3).toFixed();
  const query =
    'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?, settings = ?, name = ?';
  await db.queryAsync(query, [
    {
      id: space,
      name: settings.name,
      created_at: ts,
      updated_at: ts,
      settings: JSON.stringify(settings)
    },
    ts,
    JSON.stringify(settings),
    settings.name
  ]);
}

export async function loadSpace(id) {
  let space = false;
  try {
    const result = await getSpaceENS(id);
    if (snapshot.utils.validateSchema(snapshot.schemas.space, result) === true) space = result;
    console.log('Load space', id);
  } catch (e) {
    console.log('Load space failed', id);
  }
  return space;
}

export async function getProposal(space, id) {
  const query = `SELECT * FROM proposals WHERE space = ? AND id = ?`;
  const proposals = await db.queryAsync(query, [space, id]);
  return proposals[0];
}

export async function getSpace(id) {
  const query = `SELECT settings FROM spaces WHERE id = ? LIMIT 1`;
  const spaces = await db.queryAsync(query, [id]);
  if (!spaces[0]) return false;
  return jsonParse(spaces[0].settings, {});
}
