import { Wallet } from 'ethers';

const privateKey = process.env.RELAYER_PK;
const wallet = new Wallet(privateKey);

export default wallet;
