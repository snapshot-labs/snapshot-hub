import { getAddress } from '@ethersproject/address';
import db from '../helpers/mysql';

export async function verify(): Promise<any> {
  return true;
}

export async function action(message, ipfs, receipt, id): Promise<void> {
  const params = {
    id,
    ipfs,
    follower: getAddress(message.from),
    wallet: message.wallet,
    created: message.timestamp
  };
  await db.queryAsync('INSERT IGNORE INTO walletfollows SET ?', params);
  console.log(
    `[writer] Stored: ${message.from} follow wallet ${message.wallet}`
  );
}
