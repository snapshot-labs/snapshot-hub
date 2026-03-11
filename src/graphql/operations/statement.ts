import db from '../../helpers/mysql';

export default async function (parent, args) {
  const id = args.id;
  const query = `SELECT s.* FROM statements s WHERE id = ? LIMIT 1`;
  const statements = await db.queryAsync(query, id);
  if (statements.length === 1) return statements[0];
  return null;
}
