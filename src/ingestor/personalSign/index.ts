import { hashPersonalMessage, verifySignature } from './utils';
import { jsonParse } from '../../helpers/utils';
import { spaces } from '../../helpers/spaces';
import writer from '../../writer';
import gossip from '../../helpers/gossip';
import { pinJson } from '../../helpers/ipfs';
import relayer, { issueReceipt } from '../../helpers/relayer';
import pkg from '../../../package.json';

export default async function(body) {
  const ts = Date.now() / 1e3;
  const overTs = (ts + 300).toFixed();
  const underTs = (ts - 300).toFixed();

  if (!body || !body.address || !body.msg || !body.sig)
    return Promise.reject('wrong message body');

  const msg = jsonParse(body.msg);

  if (
    Object.keys(msg).length !== 5 ||
    !msg.space ||
    !msg.payload ||
    Object.keys(msg.payload).length === 0
  )
    return Promise.reject('wrong signed message');

  if (JSON.stringify(body).length > 1e5)
    return Promise.reject('too large message');

  if (!spaces[msg.space] && msg.type !== 'settings')
    return Promise.reject('unknown space');

  if (
    !msg.timestamp ||
    typeof msg.timestamp !== 'string' ||
    msg.timestamp.length !== 10 ||
    msg.timestamp > overTs ||
    msg.timestamp < underTs
  )
    return Promise.reject('wrong timestamp');

  if (!msg.version || msg.version !== pkg.version)
    return Promise.reject('wrong version');

  if (!msg.type || !Object.keys(writer).includes(msg.type))
    return Promise.reject('wrong message type');

  if (
    !(await verifySignature(
      body.address,
      body.sig,
      hashPersonalMessage(body.msg)
    ))
  )
    return Promise.reject('wrong signature');

  try {
    await writer[msg.type].verify(body);
  } catch (e) {
    return Promise.reject(e);
  }

  gossip(body, msg.space);

  const [id, receipt] = await Promise.all([
    pinJson(`snapshot/${body.sig}`, {
      address: body.address,
      msg: body.msg,
      sig: body.sig,
      version: '2'
    }),
    issueReceipt(body.sig)
  ]);

  try {
    await writer[msg.type].action(body, id, receipt);
  } catch (e) {
    return Promise.reject(e);
  }

  console.log(
    `Address "${body.address}"\n`,
    `Space "${msg.space}"\n`,
    `Type "${msg.type}"\n`,
    `IPFS hash "${id}"`
  );

  return {
    ipfsHash: id,
    relayer: {
      address: relayer.address,
      receipt
    }
  };
}
