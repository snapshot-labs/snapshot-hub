import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { formatAddresses, PublicError } from '../helpers';

export default async function (_parent, args) {
  const { voter } = args;

  const addresses = formatAddresses([voter]);
  if (!addresses.length) throw new PublicError('Invalid address');

  const query = `
    SELECT
      v.space,
      SUM(v.vp_value) as vp_value
    FROM votes v
    WHERE v.voter = ?
    GROUP BY v.space
    HAVING vp_value > 0
    ORDER BY vp_value DESC
  `;

  try {
    const results = await db.queryAsync(query, addresses);

    let totalVpValue = 0;
    const spaces = results.map(row => {
      totalVpValue += parseFloat(row.vp_value) || 0;

      return {
        id: row.space,
        totalVpValue: parseFloat(row.vp_value) || 0
      };
    });

    return {
      user: addresses[0],
      totalVpValue,
      spaces
    };
  } catch (err) {
    log.error(`[graphql] vp_value, ${JSON.stringify(err)}`);
    capture(err, { args });
    return Promise.reject(new Error('request failed'));
  }
}
