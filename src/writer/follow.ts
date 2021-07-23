import { getAddress } from '@ethersproject/address';
import db from '../helpers/mysql';

export async function verify(): Promise<any> {
  return true;
}

export async function action(message, id): Promise<void> {
  const params = {
    id,
    follower: getAddress(message.from),
    space: message.space
  };
  await db.queryAsync('INSERT IGNORE INTO follows SET ?', params);
  console.log(`Stored: ${message.from} follow ${message.space}`);
}
