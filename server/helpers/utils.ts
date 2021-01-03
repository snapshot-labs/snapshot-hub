import snapshot from '@snapshot-labs/snapshot.js';
import { verifyMessage } from '@ethersproject/wallet';
import { convertUtf8ToHex } from '@walletconnect/utils';
import * as ethUtil from 'ethereumjs-util';
import { isValidSignature } from './eip1271';

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export async function verify(address, msg, sig) {
  const recovered = await verifyMessage(msg, sig);
  return recovered === address;
}

export function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

export function sendError(res, description) {
  return res.status(500).json({
    error: 'unauthorized',
    error_description: description
  });
}

export function recoverPublicKey(sig: string, hash: string): string {
  const params = ethUtil.fromRpcSig(sig);
  const result = ethUtil.ecrecover(
    ethUtil.toBuffer(hash),
    params.v,
    params.r,
    params.s
  );
  return ethUtil.bufferToHex(ethUtil.publicToAddress(result));
}

export async function verifySignature(
  address: string,
  sig: string,
  hash: string
  // chainId: number
): Promise<boolean> {
  const provider = snapshot.utils.getProvider('1');
  const bytecode = await provider.getCode(address);
  if (
    !bytecode ||
    bytecode === '0x' ||
    bytecode === '0x0' ||
    bytecode === '0x00'
  ) {
    const signer = recoverPublicKey(sig, hash);
    return signer.toLowerCase() === address.toLowerCase();
  } else {
    console.log('Smart contract signature');
    return isValidSignature(address, sig, hash, provider);
  }
}

export function encodePersonalMessage(msg: string): string {
  const data = ethUtil.toBuffer(convertUtf8ToHex(msg));
  const buf = Buffer.concat([
    Buffer.from(
      '\u0019Ethereum Signed Message:\n' + data.length.toString(),
      'utf8'
    ),
    data
  ]);
  return ethUtil.bufferToHex(buf);
}

export function hashPersonalMessage(msg: string): string {
  const data = encodePersonalMessage(msg);
  const buf = ethUtil.toBuffer(data);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}

export async function sleep(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

export function formatMessage(message) {
  const metadata = JSON.parse(message.metadata);
  return [message.id, {
    address: message.address,
    msg: {
      version: message.version,
      timestamp: message.timestamp.toString(),
      space: message.space,
      type: message.type,
      payload: JSON.parse(message.payload)
    },
    sig: message.sig,
    authorIpfsHash: message.id,
    relayerIpfsHash: metadata.relayer_ipfs_hash
  }];
}
