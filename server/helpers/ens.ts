import ENS from '@ensdomains/ensjs';
import snapshot from '@snapshot-labs/snapshot.js';
import gateways from '@snapshot-labs/snapshot.js/src/gateways.json';

const gateway = gateways[0];

export async function uriGet(
  gateway: string,
  key: string,
  protocolType = 'https'
) {
  key = `storageapi.fleek.co/${process.env.FLEEK_TEAM_NAME}/${key}`;
  protocolType = 'https';
  const url = `${protocolType}://${key}`;
  return fetch(url)
    .then(res => res.text())
    .then(text => JSON.parse(text));
}

export async function getSpaceUriFromContentHash(id) {
  let uri: any = false;
  const provider = snapshot.utils.getProvider('1');
  try {
    const ensAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    const ens = new ENS({ provider, ensAddress });
    uri = await ens.name(id).getContent();
    uri = uri.value;
  } catch (e) {
    console.log('getSpaceUriFromContentHash failed', id, e);
  }
  return uri;
}

export async function getSpaceUriFromTextRecord(id) {
  let uri: any = false;
  const provider = snapshot.utils.getProvider('1');
  try {
    const ensAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    const ens = new ENS({ provider, ensAddress });
    uri = await ens.name(id).getText('snapshot');
  } catch (e) {
    console.log('getSpaceUriFromTextRecord failed', id, e);
  }
  return uri;
}

export async function getSpaceUri(id) {
  // TODO: fix this
  // let uri = await getSpaceUriFromTextRecord(id);
  // if (!uri) uri = await getSpaceUriFromContentHash(id);
  return id;
}

export async function getSpace(id) {
  let space = false;
  console.log(id);
  const uri: any = await getSpaceUri(id);
  if (uri) {
    try {
      space = await uriGet(gateway, `registry/${id}`);
    } catch (e) {
      console.log('getSpace failed', id, e);
    }
  }
  return space;
}
