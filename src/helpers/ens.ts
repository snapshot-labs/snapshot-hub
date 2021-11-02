import fetch from 'cross-fetch';
import { getSpaceUri } from '@snapshot-labs/snapshot.js/src/utils';
import gateways from '@snapshot-labs/snapshot.js/src/gateways.json';

const gateway = gateways[0];

export async function uriGet(
  gateway: string,
  key: string,
  protocolType = 'ipfs'
) {
  key = key.replace(
    'storage.snapshot.page',
    'storageapi.fleek.co/snapshot-team-bucket'
  );
  if (key.includes('storageapi.fleek.co')) protocolType = 'https';
  let url = `https://${gateway}/${protocolType}/${key}`;
  if (['https', 'http'].includes(protocolType))
    url = `${protocolType}://${key}`;
  return fetch(url).then(res => res.json());
}

export async function getSpace(id) {
  let space = false;
  const uri: any = await getSpaceUri(id);
  if (uri) {
    try {
      const [protocolType, key] = uri.split('://');
      space = await uriGet(gateway, key, protocolType);
    } catch (e) {
      console.log('getSpace failed', id, e);
    }
  }
  return space;
}
