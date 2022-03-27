import db from '../helpers/mysql';

export async function verify(): Promise<any> {
  return true;
}

export async function action(message): Promise<void> {
  const query =
    'DELETE FROM walletfollows WHERE follower = ? AND following = ? LIMIT 1';
  await db.queryAsync(query, [message.from, message.wallet]);
  console.log(
    `[writer] Stored: ${message.from} unfollow wallet ${message.wallet}`
  );
}
