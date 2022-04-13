import { getAddress } from '@ethersproject/address';
import db from '../helpers/mysql';
import { jsonParse } from '../helpers/utils';
import snapshot from '@snapshot-labs/snapshot.js';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.profile,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('[writer] Wrong profile format', schemaIsValid);
    return Promise.reject('wrong profile format');
  }
}

export async function action(message, ipfs, receipt, id): Promise<void> {
  const params = {
    id,
    ipfs,
    address: getAddress(message.from),
    username: message.username,
    bio: message.bio,
    avatar: message.avatar,
    created: message.timestamp
  };
  await db.queryAsync('INSERT IGNORE INTO users SET ?', params);
  console.log(`[writer] Stored: ${message.from} updated their profile`);
}
