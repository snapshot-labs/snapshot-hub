import relayer from './relayer';

export async function counterSign(message) {
  message.relayers = [{
    address: relayer.address,
    timestamp: (new Date().getTime() / 1000).toFixed(0)
  }];
  message.relayers[0].sig = await relayer.signMessage(JSON.stringify(message));
  return message;
}
