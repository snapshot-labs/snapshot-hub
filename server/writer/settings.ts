import snapshot from '@snapshot-labs/snapshot.js';
import { loadSpace, storeSettings } from '../helpers/adapters/mysql';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';
import { getSpaceUri } from '../helpers/ens';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  if (
    snapshot.utils.validateSchema(snapshot.schemas.space, msg.payload) !== true
  )
    return Promise.reject('wrong space format');

  const spaceUri = await getSpaceUri(msg.space);
  if (!spaceUri.includes(body.address)) return Promise.reject('not allowed');
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
