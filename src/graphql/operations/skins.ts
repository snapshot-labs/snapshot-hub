import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';

export default async function () {
  const query = `
    SELECT
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.skin')), '') AS skin,
      COUNT(id) as spacesCount
    FROM spaces
    GROUP BY skin
    ORDER BY spacesCount DESC
  `;

  try {
    return (await db.queryAsync(query)).map(v => ({ ...v, id: v.skin }));
  } catch (e: any) {
    capture(e);
    return Promise.reject(new Error('request failed'));
  }
}
