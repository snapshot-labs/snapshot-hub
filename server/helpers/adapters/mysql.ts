import snapshot from '@snapshot-labs/snapshot.js';
import fleek from '@fleekhq/fleek-storage-js';
import { isAddress, getAddress } from '@ethersproject/address';
import db from '../mysql';
import { getSpace } from '../ens';

export async function storeProposal(
  space,
  body,
  authorIpfsHash,
  relayerIpfsHash
) {
  const msg = JSON.parse(body.msg);
  let query = 'INSERT IGNORE INTO messages SET ?;';
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
  let query = 'UPDATE messages SET type = ? WHERE id = ? LIMIT 1';
  await db.queryAsync(query, ['archive-proposal', authorIpfsHash]);
}

export async function storeVote(space, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  let query = 'INSERT IGNORE INTO messages SET ?;';
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

  const ts = (Date.now() / 1e3).toFixed();
  let query =
    'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?';
  await db.queryAsync(query, [
    { id: space, created_at: ts, updated_at: ts },
    ts
  ]);
}

export async function getActiveProposals(spaces) {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  let query = `
    SELECT space, COUNT(id) AS count FROM messages WHERE
    type = 'proposal'
    AND space != ''
    AND JSON_EXTRACT(payload, "$.start") <= ?
    AND JSON_EXTRACT(payload, "$.end") >= ?
    AND (`;
  const params = [ts, ts];

  Object.entries(spaces).forEach((space: any, i) => {
    if (i !== 0) query += ' OR ';
    query += '(space = ?';
    params.push(space[0]);

    // Filter only members proposals
    if (Array.isArray(space[1].members) && space[1].members.length > 0) {
      const members = space[1].members
        .filter(member => isAddress(member))
        .map(member => getAddress(member));
      query += ' AND address IN (?)';
      params.push(members);
    } else {
      query += ' AND address = 1';
    }

    // Filter out invalids proposals
    if (
      space[1].filters &&
      Array.isArray(space[1].filters.invalids) &&
      space[1].filters.invalids.length > 0
    ) {
      query += ' AND id NOT IN (?)';
      params.push(space[1].filters.invalids);
    }

    query += ')';
  });
  query += ') GROUP BY space';
  return await db.queryAsync(query, params);
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
  console.log('Spaces', ids.length);
  const spaces = {};
  const max = 200;
  const pages = Math.ceil(ids.length / max);
  for (let i = 0; i < pages; i++) {
    const pageIds = ids.slice(max * i, max * (i + 1));
    const pageSpaces = await Promise.all(pageIds.map(id => loadSpace(id)));
    pageIds.forEach((id, index) => {
      if (pageSpaces[index]) spaces[id] = pageSpaces[index];
    });
  }
  console.timeEnd('loadSpaces');
  return spaces;
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

export async function resolveContent(provider, name) {
  const contentHash = await snapshot.utils.resolveENSContentHash(
    name,
    provider
  );
  return snapshot.utils.decodeContenthash(contentHash);
}
