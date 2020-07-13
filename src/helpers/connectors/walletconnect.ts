import WalletConnectProvider from '@walletconnect/web3-provider';

const infuraId = process.env.VUE_APP_INFURA_ID || '';

export default async function() {
  let provider;
  try {
    provider = new WalletConnectProvider({ infuraId });
    await provider.enable();
  } catch (e) {
    console.error(e);
  }
  return provider;
}
