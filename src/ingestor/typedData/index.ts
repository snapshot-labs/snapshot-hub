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
  console.log('Typed data', body);

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

  // @TODO accept settings message without existing space
  if (!spaces[message.space]) return Promise.reject('unknown space');

  if (message.timestamp > overTs || message.timestamp < underTs)
    return Promise.reject('wrong timestamp');

  if (domain.name !== NAME || domain.version !== VERSION)
    return Promise.reject('wrong domain');

  // @TODO check if EIP-712 types is allowed
  if (!types.Vote) return Promise.reject('wrong types');
  const type = 'vote';

  // Check if signature is valid
  const isValid = await snapshot.utils.verify(
    body.address,
    body.sig,
    body.data
  );
  if (!isValid) return Promise.reject('wrong signature');
  console.log('Signature is valid');

  // @TODO support 'proposal', 'delete-proposal' and 'settings'
  const legacyBody = {
    address: body.address,
    msg: JSON.stringify({
      version: domain.version,
      timestamp: message.timestamp,
      space: message.space,
      type,
      payload: {
        proposal: message.proposal,
        choice: message.choice,
        metadata: JSON.parse(message.metadata)
      }
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

  const authorIpfsRes = await pinJson(`snapshot/${body.sig}`, body);
  const relayerSig = await relayer.signMessage(authorIpfsRes);
  const relayerIpfsRes = await pinJson(`snapshot/${relayerSig}`, {
    address: relayer.address,
    msg: authorIpfsRes,
    sig: relayerSig,
    version: '2'
  });

  try {
    await writer[type].action(legacyBody, authorIpfsRes, relayerIpfsRes);
  } catch (e) {
    return Promise.reject(e);
  }

  console.log(
    `Address "${body.address}"\n`,
    `Space "${message.space}"\n`,
    `Type "${type}"\n`,
    `IPFS hash "${authorIpfsRes}"`
  );

  console.log('All good!', legacyBody);

  return {
    ipfsHash: authorIpfsRes,
    relayer: {
      address: relayer.address,
      receipt: relayerIpfsRes
    }
  };
}
