import { Wallet } from '@ethersproject/wallet';
import { pinJson } from './ipfs';

const privateKey = process.env.RELAYER_PK || '';
const wallet = new Wallet(privateKey);

// @TODO use EIP712 for relayer message
export async function issueReceipt(id) {
  const relayerSig = await wallet.signMessage(id);
  return await pinJson(`snapshot/${relayerSig}`, {
    address: wallet.address,
    msg: id,
    sig: relayerSig,
    version: '2'
  });
}

export default wallet;
