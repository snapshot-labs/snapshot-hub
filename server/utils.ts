import { verifyMessage } from '@ethersproject/wallet';

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
