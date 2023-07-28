import db from '../../helpers/mysql';
import log from '../../helpers/log';
import { capture } from '../../helpers/sentry';

export default async function (parent, args) {
  const id = args.id;
  const query = `SELECT s.* FROM statements s WHERE id = ? LIMIT 1`;
  try {
    const statements = await db.queryAsync(query, id);
    if (statements.length === 1) return statements[0];
    return null;
  } catch (e: any) {
    log.error(`[graphql] statement, ${JSON.stringify(e)}`);
    capture(e, { context: { id } });
    return Promise.reject('request failed');
  }
}
