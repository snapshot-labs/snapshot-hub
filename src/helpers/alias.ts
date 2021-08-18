import db from './mysql';

export async function isValidAlias(from, alias): Promise<boolean> {
  const query = 'SELECT * FROM aliases WHERE address = ? AND alias = ? LIMIT 1';
  const results = await db.queryAsync(query, [from, alias]);
  return !!results[0];
}
