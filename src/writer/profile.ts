import { getAddress } from '@ethersproject/address';
import db from '../helpers/mysql';
import snapshot from '@snapshot-labs/snapshot.js';

export async function verify(body): Promise<any> {
  // TODO: add this code once snapshot.js update is released with the profile schema.
  // const schemaIsValid = snapshot.utils.validateSchema(
  //   snapshot.schemas.profile,
  //   body.profile
  // );
  // if (schemaIsValid !== true) {
  //   console.log('[writer] Wrong profile format', schemaIsValid);
  //   return Promise.reject('wrong profile format');
  // }

  return true;
}

export async function action(message, ipfs, receipt, id): Promise<void> {
  const params = {
    id,
    ipfs,
    address: getAddress(message.from),
    created: message.timestamp,
    profile: JSON.stringify(message.profile)
  };

  await db.queryAsync('REPLACE INTO users SET ?', params);
  console.log(`[writer] Stored: ${message.from} updated their profile`);
}
