/*
import fleek from '@fleekhq/fleek-storage-js';

const config: any = {
  apiKey: process.env.FLEEK_API_KEY,
  apiSecret: process.env.FLEEK_API_SECRET
};

export async function pinJson(key: string, body) {
  const input = config;
  input.key = key;
  input.data = JSON.stringify(body);
  const result = await fleek.upload(input);
  return result.hashV0;
}
*/

import pinataSDK from '@pinata/sdk';

const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

export async function pinJson(key: string, body) {
  try {
    const result = await pinata.pinJSONToIPFS(body);
    return result.IpfsHash;
  } catch (e) {
    console.log('Failed to pin to IPFS', e);
  }
}
