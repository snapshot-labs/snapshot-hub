import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';

export default async function () {
  const query = `
    SELECT
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.validation.name')), '') AS validation,
      COUNT(id) as spacesCount
    FROM spaces
    GROUP BY validation
    ORDER BY spacesCount DESC
  `;

  try {
    return (await db.queryAsync(query)).map(v => ({ ...v, id: v.validation }));
  } catch (e: any) {
    capture(e);
    return Promise.reject(new Error('request failed'));
  }
}
