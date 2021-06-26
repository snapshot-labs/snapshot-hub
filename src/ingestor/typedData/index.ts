import snapshot from '@snapshot-labs/snapshot.js';
import relayer from '../../helpers/relayer';
import envelop from './envelop.json';

export default async function(body) {
  console.log('Typed data', body);

  const schemaIsValid = snapshot.utils.validateSchema(envelop, body);
  if (schemaIsValid !== true) {
    console.log('Wrong envelop format', schemaIsValid);
    return Promise.reject('wrong envelop format');
  }

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
