import db from '../helpers/mysql';

export async function verify(): Promise<any> {
  return true;
}

export async function action(message): Promise<void> {
  const query = 'DELETE FROM follows WHERE follower = ? AND space = ? LIMIT 1';
  await db.queryAsync(query, [message.from, message.space]);
  console.log(`Stored: ${message.from} unfollow ${message.space}`);
}
