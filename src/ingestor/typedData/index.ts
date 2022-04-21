import snapshot from '@snapshot-labs/snapshot.js';
import hashTypes from '@snapshot-labs/snapshot.js/src/sign/types.json';
import relayer, { issueReceipt } from '../../helpers/relayer';
import envelope from './envelope.json';
import { spaces } from '../../helpers/spaces';
import writer from '../../writer';
// import gossip from '../../helpers/gossip';
import { pinJson } from '../../helpers/ipfs';
import { sha256 } from '../../helpers/utils';
import { isValidAlias } from '../../helpers/alias';

const NAME = 'snapshot';
const VERSION = '0.1.4';

export default async function ingestor(body) {
  const schemaIsValid = snapshot.utils.validateSchema(envelope, body);
  if (schemaIsValid !== true) {
    console.log('[ingestor] Wrong envelope format', schemaIsValid);
    return Promise.reject('wrong envelope format');
  }

  const ts = Date.now() / 1e3;
  const over = 300;
  const under = 60 * 60;
  const overTs = (ts + over).toFixed();
  const underTs = (ts - under).toFixed();
  const { domain, message, types } = body.data;

  if (JSON.stringify(body).length > 1e5)
    return Promise.reject('too large message');

  if (message.timestamp > overTs || message.timestamp < underTs)
    return Promise.reject('wrong timestamp');

  if (domain.name !== NAME || domain.version !== VERSION)
    return Promise.reject('wrong domain');

  const hash = sha256(JSON.stringify(types));
  if (!Object.keys(hashTypes).includes(hash))
    return Promise.reject('wrong types');
  let type = hashTypes[hash];

  if (
    !['settings', 'alias', 'profile'].includes(type) &&
    (!message.space || !spaces[message.space])
  )
    return Promise.reject('unknown space');

  // Check if signing address is an alias
  if (body.address !== message.from) {
    if (
      !['follow', 'unfollow', 'subscribe', 'unsubscribe', 'profile'].includes(
        type
      )
    )
      return Promise.reject('wrong from');

    if (!(await isValidAlias(message.from, body.address)))
      return Promise.reject('wrong alias');
  }

  // Check if signature is valid
  const isValid = await snapshot.utils.verify(
    body.address,
    body.sig,
    body.data
  );
  const id = snapshot.utils.getHash(body.data);
  if (!isValid) return Promise.reject('wrong signature');
  console.log('[ingestor] Signature is valid');

  let payload = {};

  if (type === 'settings') payload = JSON.parse(message.settings);

  if (type === 'proposal')
    payload = {
      name: message.title,
      body: message.body,
      discussion: message.discussion || '',
      choices: message.choices,
      start: message.start,
      end: message.end,
      snapshot: message.snapshot,
      metadata: {
        plugins: JSON.parse(message.plugins),
        network: message.network,
        strategies: JSON.parse(message.strategies),
        ...JSON.parse(message.metadata)
      },
      type: message.type
    };

  if (type === 'delete-proposal') payload = { proposal: message.proposal };

  if (['vote', 'vote-array', 'vote-string'].includes(type)) {
    let choice = message.choice;
    if (type === 'vote-string') choice = JSON.parse(message.choice);
    payload = {
      proposal: message.proposal,
      choice,
      metadata: JSON.parse(message.metadata)
    };
    type = 'vote';
  }

  let legacyBody = {
    address: body.address,
    msg: JSON.stringify({
      version: domain.version,
      timestamp: message.timestamp,
      space: message.space,
      type,
      payload
    }),
    sig: body.sig
  };

  if (
    [
      'follow',
      'unfollow',
      'alias',
      'subscribe',
      'unsubscribe',
      'profile'
    ].includes(type)
  ) {
    legacyBody = message;
  }

  try {
    await writer[type].verify(legacyBody);
  } catch (e) {
    console.log('[ingestor]', e);
    return Promise.reject(e);
  }

  // @TODO gossip to typed data endpoint
  // gossip(body, message.space);

  const [ipfs, receipt] = await Promise.all([
    pinJson(`snapshot/${body.sig}`, body),
    issueReceipt(body.sig)
  ]);

  try {
    await writer[type].action(legacyBody, ipfs, receipt, id);
  } catch (e) {
    return Promise.reject(e);
  }

  console.log(
    '[ingestor]',
    `Address "${body.address}"\n`,
    `Space "${message.space}"\n`,
    `Type "${type}"\n`,
    `Id "${id}"\n`,
    `IPFS "${ipfs}"`
  );

  return {
    id,
    ipfs,
    relayer: {
      address: relayer.address,
      receipt
    }
  };
}
