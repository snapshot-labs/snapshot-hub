import db from '../helpers/mysql';

export async function storeMsg(
  id,
  ipfs,
  address,
  version,
  timestamp,
  space,
  type,
  sig,
  receipt
) {
  const query = 'INSERT IGNORE INTO messages SET ?';
  await db.queryAsync(query, [
    {
      id,
      ipfs,
      address,
      version,
      timestamp,
      space,
      type,
      sig,
      receipt
    }
  ]);
}
