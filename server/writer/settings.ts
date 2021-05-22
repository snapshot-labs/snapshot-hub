import snapshot from '@snapshot-labs/snapshot.js';
import isEqual from 'lodash/isEqual';
import { loadSpace, storeSettings } from '../helpers/adapters/mysql';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';
import { getSpaceUri } from '../helpers/ens';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.space,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('Wrong space format', schemaIsValid);
    return Promise.reject('wrong space format');
  }

  const admins = (spaces[msg.space].admins || []).map(admin =>
    admin.toLowerCase()
  );
  const isAdmin = admins.includes(body.address.toLowerCase());
  const spaceUri = await getSpaceUri(msg.space);
  const isOwner = spaceUri.includes(body.address);

  if (!isAdmin && !isOwner) return Promise.reject('not allowed');

  const newAdmins = (msg.payload.admins || []).map(admin =>
    admin.toLowerCase()
  );
  if (!isOwner && isAdmin && !isEqual(admins, newAdmins))
    return Promise.reject('not allowed to change admins');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);

  try {
    await storeSettings(msg.space, body);
    spaces[msg.space] = msg.payload;
    setTimeout(async () => {
      const space = await loadSpace(msg.space);
      console.log('Updated space', msg.space, space);
      if (space) spaces[msg.space] = space;
    }, 75e3);
  } catch (e) {
    console.log(e);
  }
}
