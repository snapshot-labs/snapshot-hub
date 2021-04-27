import snapshot from '@snapshot-labs/snapshot.js';
import fleek from '@fleekhq/fleek-storage-js';
import db from '../mysql';
import { getSpace } from '../ens';
import { spaceIdsFailed, spaces } from '../spaces';

export async function addOrUpdateSpace(space: string) {
  const ts = (Date.now() / 1e3).toFixed();
  const query =
    'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?';
  await db.queryAsync(query, [
    { id: space, created_at: ts, updated_at: ts },
    ts
  ]);
}

export async function loadSpace(id) {
  let space = false;
  try {
    const result = await getSpace(id);
    if (snapshot.utils.validateSchema(snapshot.schemas.space, result))
      space = result;
    console.log('Load space', id);
  } catch (e) {
    console.log('Load space failed', id);
  }
  return space;
}

export async function storeProposal(
  space,
  body,
  authorIpfsHash,
  relayerIpfsHash
) {
  const msg = JSON.parse(body.msg);
  const query = 'INSERT IGNORE INTO messages SET ?;';
  await db.queryAsync(query, [
    {
      id: authorIpfsHash,
      address: body.address,
      version: msg.version,
      timestamp: msg.timestamp,
      space,
      type: 'proposal',
      payload: JSON.stringify(msg.payload),
      sig: body.sig,
      metadata: JSON.stringify({
        relayer_ipfs_hash: relayerIpfsHash
      })
    }
  ]);
}

export async function archiveProposal(authorIpfsHash) {
  const query = 'UPDATE messages SET type = ? WHERE id = ? LIMIT 1';
  await db.queryAsync(query, ['archive-proposal', authorIpfsHash]);
}

export async function storeVote(space, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  const query = 'INSERT IGNORE INTO messages SET ?;';
  await db.queryAsync(query, [
    {
      id: authorIpfsHash,
      address: body.address,
      version: msg.version,
      timestamp: msg.timestamp,
      space,
      type: 'vote',
      payload: JSON.stringify(msg.payload),
      sig: body.sig,
      metadata: JSON.stringify({
        relayer_ipfs_hash: relayerIpfsHash
      })
    }
  ]);
}

export async function storeSettings(space, body) {
  const msg = JSON.parse(body.msg);

  const key = `registry/${body.address}/${space}`;
  const result = await fleek.upload({
    apiKey: process.env.FLEEK_API_KEY || '',
    apiSecret: process.env.FLEEK_API_SECRET || '',
    bucket: 'snapshot-team-bucket',
    key,
    data: JSON.stringify(msg.payload)
  });
  const ipfsHash = result.hashV0;
  console.log('Settings updated', space, ipfsHash);

  await addOrUpdateSpace(space);
}

export async function getActiveProposals() {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  const query = `
    SELECT space, COUNT(id) AS count FROM proposals
    WHERE timestamp > ? AND space != '' AND start < ? AND end > ?
    GROUP BY space
  `;
  return await db.queryAsync(query, [1618473607, ts, ts]);
}

export async function loadSpaces() {
  console.time('loadSpaces');
  const query = 'SELECT id FROM spaces';
  let result = [];
  try {
    result = await db.queryAsync(query);
  } catch (e) {
    console.log(e);
  }
  const ids = result.map((space: any) => space.id);
  console.log('Spaces from db', ids.length);
  const _spaces = {};
  const max = 1000;
  const pages = Math.ceil(ids.length / max);
  for (let i = 0; i < pages; i++) {
    const pageIds = ids.slice(max * i, max * (i + 1));
    const pageSpaces = await Promise.all(pageIds.map(id => loadSpace(id)));
    pageIds.forEach((id, index) => {
      if (pageSpaces[index]) {
        _spaces[id] = pageSpaces[index];
        spaces[id] = pageSpaces[index];
      } else {
        spaceIdsFailed.push(id);
      }
    });
  }
  console.timeEnd('loadSpaces');
  return _spaces;
}

export async function resolveContent(provider, name) {
  const contentHash = await snapshot.utils.resolveENSContentHash(
    name,
    provider
  );
  return snapshot.utils.decodeContenthash(contentHash);
}

export async function getProposal(space, id) {
  const query = `SELECT * FROM messages WHERE space = ? AND id = ? AND type = 'proposal'`;
  const proposals = await db.queryAsync(query, [space, id]);
  return proposals[0];
}
