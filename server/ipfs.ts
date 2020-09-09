import fleek from '@fleekhq/fleek-storage-js';
import pinataSDK from '@pinata/sdk';

const service = process.env.PINNING_SERVICE || 'pinata';

const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);
const config: any = {
  apiKey: process.env.FLEEK_API_KEY,
  apiSecret: process.env.FLEEK_API_SECRET
};

export async function pinJson(key: string, body) {
  // @ts-ignore
  if (service === 'fleek') {
    const input = config;
    input.key = key;
    input.data = JSON.stringify(body);
    const result = await fleek.upload(input);
    return result.hashV0;
  } else {
    const result = await pinata.pinJSONToIPFS(body);
    return result.IpfsHash;
  }
}
