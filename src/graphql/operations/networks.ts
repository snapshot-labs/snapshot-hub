import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';

export default async function () {
  const query = `
    SELECT
      JSON_UNQUOTE(JSON_EXTRACT(settings, '$.network')) as network,
      COUNT(name) AS spacesCount
    FROM spaces
    GROUP BY network
    ORDER BY spacesCount DESC;
  `;

  try {
    return (await db.queryAsync(query)).map(v => ({ ...v, id: v.network }));
  } catch (e: any) {
    capture(e);
    return Promise.reject(new Error('request failed'));
  }
}
