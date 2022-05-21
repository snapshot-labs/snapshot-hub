import fleek from '@fleekhq/fleek-storage-js';
import db from './mysql';
import { jsonParse } from './utils';

export async function addOrUpdateSpace(space: string, settings: any) {
  if (!settings || !settings.name) return false;
  const ts = (Date.now() / 1e3).toFixed();
  const query =
    'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?, settings = ?';
  await db.queryAsync(query, [
    {
      id: space,
      created_at: ts,
      updated_at: ts,
      settings: JSON.stringify(settings)
    },
    ts,
    JSON.stringify(settings)
  ]);
}

export async function storeSettings(space, body) {
  const msg = JSON.parse(body.msg);

  const key = `registry/${body.address}/${space}`;
  const result = await fleek.upload({
    apiKey: process.env.FLEEK_API_KEY || '',
    apiSecret: process.env.FLEEK_API_SECRET || '',
    bucket: process.env.FLEEK_BUCKET || 'snapshot-team-bucket',
    key,
    data: JSON.stringify(msg.payload)
  });
  const ipfsHash = result.hashV0;
  console.log('Settings updated', space, ipfsHash);

  await addOrUpdateSpace(space, msg.payload);
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
