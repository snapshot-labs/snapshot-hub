import { getAddress } from '@ethersproject/address';
import db from '../helpers/mysql';

export async function verify(message): Promise<any> {
  return message.from !== message.alias;
}

export async function action(message, id): Promise<void> {
  const params = {
    id,
    ipfs: id,
    address: getAddress(message.from),
    alias: getAddress(message.alias),
    created: message.timestamp
  };
  await db.queryAsync('INSERT IGNORE INTO aliases SET ?', params);
  console.log(`Stored: ${message.from} alias ${message.alias}`);
}
