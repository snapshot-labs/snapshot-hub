import snapshot from '@snapshot-labs/snapshot.js';
import gateways from '@snapshot-labs/snapshot.js/src/gateways.json';
import fleek from '@fleekhq/fleek-storage-js';
import { isAddress, getAddress } from '@ethersproject/address';
import db from '../mysql';
import getProvider from '../provider';
import resolveENSContentHash from '../resolveENSContentHash';
import { decodeContenthash } from '../content';

export async function storeProposal(space, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  let query = 'INSERT IGNORE INTO messages SET ?;';
  await db.queryAsync(query, [{
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
  }]);
}

export async function storeVote(space, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  let query = 'INSERT IGNORE INTO messages SET ?;';
  await db.queryAsync(query, [{
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
  }]);
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
  console.log('Settings updated', ipfsHash);

  const ts = (Date.now() / 1e3).toFixed();
  let query = 'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?';
  await db.queryAsync(query, [{ id: space, created_at: ts, updated_at: ts}, ts]);
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
      query += ' AND address = 1'
    }

    // Filter out invalids proposals
    if (
      space[1].filters
      && Array.isArray(space[1].filters.invalids)
      && space[1].filters.invalids.length > 0
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
  const query = 'SELECT id FROM spaces';
  const result = await db.queryAsync(query);
  const ids = result.map(space => space.id);
  const spaces = {};
  for (const id of ids) {
    try {
      const { protocolType, decoded } = await resolveContent(getProvider('1'), id);
      const ts = (Date.now() / 1e3).toFixed();
      const space = await snapshot.utils.ipfsGet(gateways[0], `${decoded}?cb=${ts}`, protocolType);
      if (snapshot.utils.validateSchema(snapshot.schemas.space, space))
        spaces[id] = space;
    } catch (e) {
      console.log(e);
    }
  }
  return spaces;
}

export async function resolveContent(provider, name) {
  const contentHash = await resolveENSContentHash(name, provider);
  return decodeContenthash(contentHash);
}
