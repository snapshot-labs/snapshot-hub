import snapshot from '@snapshot-labs/snapshot.js';
import * as ethUtil from 'ethereumjs-util';
import { isValidSignature } from '../../helpers/eip1271';

export function recoverPublicKey(sig: string, hash: string): string {
  const params = ethUtil.fromRpcSig(sig);
  const result = ethUtil.ecrecover(ethUtil.toBuffer(hash), params.v, params.r, params.s);
  return ethUtil.bufferToHex(ethUtil.publicToAddress(result));
}

export async function verifySignature(
  address: string,
  sig: string,
  hash: string,
  network = '1'
): Promise<boolean> {
  const provider = snapshot.utils.getProvider(network);
  const bytecode = await provider.getCode(address);
  if (!bytecode || bytecode === '0x' || bytecode === '0x0' || bytecode === '0x00') {
    const signer = recoverPublicKey(sig, hash);
    return signer.toLowerCase() === address.toLowerCase();
  } else {
    console.log('[ingestor] Smart contract signature');
    return isValidSignature(address, sig, hash, provider);
  }
}
