import snapshot from '@snapshot-labs/snapshot.js';
import fleek from '@fleekhq/fleek-storage-js';
import db from '../mysql';
import { getSpace as getSpaceENS } from '../ens';
import { jsonParse } from '../utils';

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

export async function loadSpace(id) {
  let space = false;
  try {
    const result = await getSpaceENS(id);
    if (snapshot.utils.validateSchema(snapshot.schemas.space, result))
      space = result;
    console.log('Load space', id);
  } catch (e) {
    console.log('Load space failed', id);
  }
  return space;
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

export async function getProposals() {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  const query = `
    SELECT space, COUNT(id) AS count,
    COUNT(IF(start < ? AND end > ?, 1, NULL)) AS active,
    COUNT(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) AS count_1d
    FROM proposals GROUP BY space
  `;
  return await db.queryAsync(query, [ts, ts]);
}

export async function getFollowers() {
  const query = `
    SELECT space, COUNT(id) as count, count(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) as count_1d FROM follows GROUP BY space
  `;
  return await db.queryAsync(query);
}

export async function getOneDayVoters() {
  const query = `
    SELECT space, COUNT(DISTINCT(voter)) AS count FROM votes
    WHERE created > (UNIX_TIMESTAMP() - 86400) GROUP BY space
  `;
  return await db.queryAsync(query);
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
