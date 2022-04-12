import { getAddress } from '@ethersproject/address';
import db from '../helpers/mysql';

export async function verify(): Promise<any> {
  return true;
}

export async function action(message, ipfs, receipt, id): Promise<void> {
  const params = {
    id,
    ipfs,
    address: getAddress(message.from),
    username: message.username,
    bio: message.bio,
    avatar: message.avatar,
    created: message.timestamp
  };
  await db.queryAsync('INSERT IGNORE INTO users SET ?', params);
  console.log(`[writer] Stored: ${message.from} updated their profile`);
}
