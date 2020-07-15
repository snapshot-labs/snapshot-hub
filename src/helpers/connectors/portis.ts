import Portis from '@portis/web3';

let portis;
const dappId = process.env.VUE_APP_PORTIS_DAPP_ID || '';

async function isLoggedIn() {
  return true;
}

async function connect(options) {
  let provider;
  try {
    portis = new Portis(dappId, options.network);
    await portis.provider.enable();
    portis.provider._portis = portis;
    provider = portis.provider;
  } catch (e) {
    console.error(e);
  }
  return provider;
}

export default {
  connect,
  isLoggedIn
};
