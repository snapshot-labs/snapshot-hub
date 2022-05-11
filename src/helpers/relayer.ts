import { Wallet } from '@ethersproject/wallet';
import { pin } from '@snapshot-labs/pineapple';

const privateKey = process.env.RELAYER_PK || '';
const wallet = new Wallet(privateKey);

// @TODO use EIP712 for relayer message
export async function issueReceipt(id) {
  const relayerSig = await wallet.signMessage(id);
  const { cid } = await pin({
    address: wallet.address,
    msg: id,
    sig: relayerSig,
    version: '2'
  });
  return cid;
}

export default wallet;
