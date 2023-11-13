import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';

export default async function () {
  const query = `
    SELECT s.name as id, count(s.name) as spacesCount
    FROM
      spaces,
      JSON_TABLE(
        JSON_KEYS(settings, '$.plugins'),
        '$[*]' COLUMNS (name VARCHAR(255)  PATH '$')
      ) s
    GROUP BY s.name
    ORDER BY spacesCount DESC;
  `;

  try {
    return await db.queryAsync(query);
  } catch (e: any) {
    capture(e);
    return Promise.reject(new Error('request failed'));
  }
}
