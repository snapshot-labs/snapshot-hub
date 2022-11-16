import isEqual from 'lodash/isEqual';
import snapshot from '@snapshot-labs/snapshot.js';
import { addOrUpdateSpace, getSpace } from '../../helpers/actions';
import { jsonParse } from '../../helpers/utils';
import log from '../../helpers/log';

const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK || '1';
const networkPath = DEFAULT_NETWORK === '1' ? '' : 'testnet/';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(snapshot.schemas.space, msg.payload);
  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong space format', schemaIsValid);
    return Promise.reject('wrong space format');
  }

  const spaceUri = await snapshot.utils.getSpaceUri(msg.space, DEFAULT_NETWORK);
  const spaceIdUri = encodeURIComponent(msg.space);
  const isOwner =
    spaceUri ===
    `ipns://storage.snapshot.page/registry/${networkPath}${body.address}/${spaceIdUri}`;
  const space = await getSpace(msg.space);
  const admins = (space?.admins || []).map(admin => admin.toLowerCase());
  const isAdmin = admins.includes(body.address.toLowerCase());
  const newAdmins = (msg.payload.admins || []).map(admin => admin.toLowerCase());

  if (!isAdmin && !isOwner) return Promise.reject('not allowed');

  if (!isOwner && !isEqual(admins, newAdmins)) return Promise.reject('not allowed change admins');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;
  try {
    await addOrUpdateSpace(space, msg.payload);
  } catch (e) {
    log.error('[writer] Failed to store settings', msg.space, e);
    return Promise.reject('failed store settings');
  }
}
