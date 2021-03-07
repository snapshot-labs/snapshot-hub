import { Wallet } from '@ethersproject/wallet';

declare var process : {
  env: {
    RELAYER_PK: string
  }
}

const privateKey = process.env.RELAYER_PK;
const wallet = new Wallet(privateKey);

export default wallet;
