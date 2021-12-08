import snapshot from '@snapshot-labs/snapshot.js';
import isEqual from 'lodash/isEqual';
import { storeSettings } from '../helpers/adapters/mysql';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';

const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK || '1';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.space,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('[writer] Wrong space format', schemaIsValid);
    return Promise.reject('wrong space format');
  }

  const spaceUri = await snapshot.utils.getSpaceUri(msg.space, DEFAULT_NETWORK);
  const isOwner = spaceUri.includes(body.address);
  const admins = (spaces[msg.space]?.admins || []).map(admin =>
    admin.toLowerCase()
  );
  const isAdmin = admins.includes(body.address.toLowerCase());
  const newAdmins = (msg.payload.admins || []).map(admin =>
    admin.toLowerCase()
  );

  if (!isAdmin && !isOwner) return Promise.reject('not allowed');

  if (!isOwner && !isEqual(admins, newAdmins))
    return Promise.reject('not allowed change admins');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  try {
    await storeSettings(msg.space, body);
    spaces[msg.space] = msg.payload;
  } catch (e) {
    console.log('[writer] Failed to store settings', msg.space, e);
  }
}
