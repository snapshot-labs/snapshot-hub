export default async function() {
  let provider;
  if (window['ethereum']) {
    provider = window['ethereum'];
    try {
      await window['ethereum'].enable();
    } catch (e) {
      console.error(e);
    }
  } else if (window['web3']) {
    provider = window['web3'].currentProvider;
  }
  return provider;
}
