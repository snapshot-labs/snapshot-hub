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
    space: message.space,
    created: message.timestamp
  };
  await db.queryAsync('INSERT IGNORE INTO subscriptions SET ?', params);
  console.log(`Stored: ${message.from} subscribed ${message.space}`);
}
