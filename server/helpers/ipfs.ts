import pinataSDK from '@pinata/sdk';

const pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);

export async function pinJson(key: string, body) {
  const result = await pinata.pinJSONToIPFS(body);
  return result.IpfsHash;
}
