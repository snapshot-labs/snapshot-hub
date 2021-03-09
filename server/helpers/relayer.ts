// import { Wallet } from '@ethersproject/wallet';

const privateKey = process.env.RELAYER_PK;
// const wallet = new Wallet(privateKey);

const wallet = {
  address: privateKey,
  signMessage: (key: string) => key
};

export default wallet;
