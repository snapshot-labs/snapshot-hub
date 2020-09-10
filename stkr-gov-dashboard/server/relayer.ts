import { Wallet } from '@ethersproject/wallet';

const privateKey = process.env.RELAYER_PK;
const wallet = new Wallet(privateKey);

export default wallet;
