import relayer from '../../helpers/relayer';

export default async function(body) {
  console.log('Typed data', body);

  // const ts = Date.now() / 1e3;
  // const overTs = (ts + 300).toFixed();
  // const underTs = (ts - 300).toFixed();

  return {
    ipfsHash: '',
    relayer: {
      address: relayer.address,
      receipt: ''
    }
  };
}
