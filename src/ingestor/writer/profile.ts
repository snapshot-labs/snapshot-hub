import { getAddress } from '@ethersproject/address';
import snapshot from '@snapshot-labs/snapshot.js';
import db from '../../helpers/mysql';
import { jsonParse } from '../../helpers/utils';
import log from '../../helpers/log';

export async function verify(body): Promise<any> {
  const profile = jsonParse(body.profile, {});
  const schemaIsValid = snapshot.utils.validateSchema(snapshot.schemas.profile, profile);
  if (schemaIsValid !== true) {
    log.warn(`[writer] Wrong profile format ${JSON.stringify(schemaIsValid)}`);
    return Promise.reject('wrong profile format');
  }

  return true;
}

export async function action(message, ipfs): Promise<void> {
  const profile = jsonParse(message.profile, {});

  const params = {
    id: getAddress(message.from),
    ipfs,
    created: message.timestamp,
    profile: JSON.stringify(profile)
  };

  await db.queryAsync('REPLACE INTO users SET ?', params);
}
