import snapshot from '@snapshot-labs/snapshot.js';
import fleek from '@fleekhq/fleek-storage-js';
import isEqual from 'lodash/isEqual';
import { addOrUpdateSpace, getSpace } from '../../helpers/actions';
import { jsonParse } from '../../helpers/utils';

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

  let isOwner = false;
  let isSameSpace = false;
  const spaceUriArray = spaceUri?.split('/') ?? [];
  if (DEFAULT_NETWORK === '1') {
    isOwner = spaceUriArray[4] === body.address;
    isSameSpace = spaceUriArray[5] === msg.space;
  } else if (spaceUriArray[4] === 'testnet') {
    isOwner = spaceUriArray[5] === body.address;
    isSameSpace = spaceUriArray[6] === msg.space;
  }

  const space = await getSpace(msg.space);
  const admins = (space?.admins || []).map(admin => admin.toLowerCase());
  const isAdmin = admins.includes(body.address.toLowerCase());
  const newAdmins = (msg.payload.admins || []).map(admin =>
    admin.toLowerCase()
  );

  if (!isSameSpace) return Promise.reject('not allowed');
  if (!isAdmin && !isOwner) return Promise.reject('not allowed');

  if (!isOwner && !isEqual(admins, newAdmins))
    return Promise.reject('not allowed change admins');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  const space = msg.space;
  const registryNetworkPath = DEFAULT_NETWORK === '1' ? '' : 'testnet/';
  try {
    const key = `registry/${registryNetworkPath}${body.address}/${space}`;
    const result = await fleek.upload({
      apiKey: process.env.FLEEK_API_KEY || '',
      apiSecret: process.env.FLEEK_API_SECRET || '',
      bucket: process.env.FLEEK_BUCKET || 'snapshot-team-bucket',
      key,
      data: JSON.stringify(msg.payload)
    });
    const ipfsHash = result.hashV0;
    console.log('Settings updated', space, ipfsHash);
    await addOrUpdateSpace(space, msg.payload);
  } catch (e) {
    console.log('[writer] Failed to store settings', msg.space, e);
  }
}
