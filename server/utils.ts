import { verifyMessage } from '@ethersproject/wallet';
import relayer from './relayer';

export async function counterSign(message) {
  message.relayers = [{
    address: relayer.address,
    timestamp: (new Date().getTime() / 1e3).toFixed(0)
  }];
  message.relayers[0].sig = await relayer.signMessage(JSON.stringify(message));
  return message;
}

export async function verify(message, sig, address) {
  delete message.authors[0].sig;
  const recovered = await verifyMessage(JSON.stringify(message), sig);
  return recovered === address;
}
