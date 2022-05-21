import { hashMessage } from '@ethersproject/hash';
import { pin } from '@snapshot-labs/pineapple';
import { verifySignature } from './helpers/sig';
import { jsonParse } from './helpers/utils';
import writer from './writer';
import relayer, { issueReceipt } from './helpers/relayer';
import pkg from '../package.json';
import { getSpace } from './helpers/actions';

export default async function ingestor(body) {
  const ts = Date.now() / 1e3;
  const over = 300;
  const under = 60 * 60 * 24 * 2;
  const overTs = (ts + over).toFixed();
  const underTs = (ts - under).toFixed();

  if (!body || !body.address || !body.msg || !body.sig) return Promise.reject('wrong message body');

  const msg = jsonParse(body.msg);

  if (
    Object.keys(msg).length !== 5 ||
    !msg.space ||
    !msg.payload ||
    Object.keys(msg.payload).length === 0
  )
    return Promise.reject('wrong signed message');

  if (JSON.stringify(body).length > 1e5) return Promise.reject('too large message');

  if (msg.type !== 'settings') {
    const space = await getSpace(msg.space);
    if (!space) return Promise.reject('unknown space');
  }

  if (
    !msg.timestamp ||
    typeof msg.timestamp !== 'string' ||
    msg.timestamp.length !== 10 ||
    msg.timestamp > overTs ||
    msg.timestamp < underTs
  )
    return Promise.reject('wrong timestamp');

  if (!msg.version || msg.version !== pkg.version) return Promise.reject('wrong version');

  if (!msg.type || !Object.keys(writer).includes(msg.type))
    return Promise.reject('wrong message type');

  if (!(await verifySignature(body.address, body.sig, hashMessage(body.msg))))
    return Promise.reject('wrong signature');

  try {
    await writer[msg.type].verify(body);
  } catch (e) {
    return Promise.reject(e);
  }

  let pinned;
  let receipt;
  try {
    [pinned, receipt] = await Promise.all([
      pin({
        address: body.address,
        msg: body.msg,
        sig: body.sig,
        version: '2'
      }),
      issueReceipt(body.sig)
    ]);
  } catch (e) {
    return Promise.reject('pinning failed');
  }
  const ipfs = pinned.cid;
  const id = ipfs;

  try {
    await writer[msg.type].action(body, ipfs, receipt, id);
  } catch (e) {
    return Promise.reject(e);
  }

  console.log(
    '[ingestor] ',
    `Address "${body.address}", `,
    `Space "${msg.space}", `,
    `Type "${msg.type}", `,
    `Id "${id}", `,
    `IPFS "${ipfs}"`
  );

  return {
    id,
    ipfsHash: ipfs,
    relayer: {
      address: relayer.address,
      receipt
    }
  };
}
