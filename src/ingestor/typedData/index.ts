import snapshot from '@snapshot-labs/snapshot.js';
import relayer from '../../helpers/relayer';
import envelop from './envelop.json';
import { spaces } from '../../helpers/spaces';
import writer from '../../writer';
// import gossip from '../../helpers/gossip';
import { pinJson } from '../../helpers/ipfs';

const NAME = 'snapshot';
const VERSION = '0.1.4';

export default async function(body) {
  const schemaIsValid = snapshot.utils.validateSchema(envelop, body);
  if (schemaIsValid !== true) {
    console.log('Wrong envelop format', schemaIsValid);
    return Promise.reject('wrong envelop format');
  }

  const ts = Date.now() / 1e3;
  const overTs = (ts + 300).toFixed();
  const underTs = (ts - 300).toFixed();
  const { domain, message, types } = body.data;

  if (JSON.stringify(body).length > 1e5)
    return Promise.reject('too large message');

  if (message.timestamp > overTs || message.timestamp < underTs)
    return Promise.reject('wrong timestamp');

  if (domain.name !== NAME || domain.version !== VERSION)
    return Promise.reject('wrong domain');

  // @TODO check if EIP-712 types is allowed
  let type = Object.keys(types)[0].toLowerCase();
  type = type
    .replace('cancelproposal', 'delete-proposal')
    .replace('space', 'settings');
  if (!['settings', 'proposal', 'delete-proposal', 'vote'].includes(type))
    return Promise.reject('wrong types');

  if (type !== 'settings' && !spaces[message.space])
    return Promise.reject('unknown space');

  // Check if signature is valid
  const isValid = await snapshot.utils.verify(
    body.address,
    body.sig,
    body.data
  );
  if (!isValid) return Promise.reject('wrong signature');
  console.log('Signature is valid');

  let payload = {};

  if (type === 'settings') payload = JSON.parse(message.settings);

  if (type === 'proposal')
    payload = {
      name: message.title,
      body: message.body,
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

  if (type === 'vote')
    payload = {
      proposal: message.proposal,
      choice: message.choice,
      metadata: JSON.parse(message.metadata)
    };

  const legacyBody = {
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

  try {
    await writer[type].verify(legacyBody);
  } catch (e) {
    return Promise.reject(e);
  }

  // @TODO gossip to typed data endpoint
  // gossip(body, message.space);

  const id = await pinJson(`snapshot/${body.sig}`, body);

  // @TODO use EIP712 for relayer message
  const relayerSig = await relayer.signMessage(id);
  const relayerIpfsRes = await pinJson(`snapshot/${relayerSig}`, {
    address: relayer.address,
    msg: id,
    sig: relayerSig,
    version: '2'
  });

  try {
    await writer[type].action(legacyBody, id, relayerIpfsRes);
  } catch (e) {
    return Promise.reject(e);
  }

  console.log(
    `Address "${body.address}"\n`,
    `Space "${message.space}"\n`,
    `Type "${type}"\n`,
    `Id "${id}"`
  );

  return {
    id,
    relayer: {
      address: relayer.address,
      receipt: relayerIpfsRes
    }
  };
}
