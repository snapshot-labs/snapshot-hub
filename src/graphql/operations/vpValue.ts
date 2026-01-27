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
      SUM(v.vp_value) as vp_value,
      COUNT(*) as votes_count
    FROM votes v
    WHERE v.voter = ?
    GROUP BY v.space
    HAVING vp_value > 0
    ORDER BY vp_value DESC
  `;

  try {
    const results = await db.queryAsync(query, addresses);

    let totalVpValue = 0;
    let votesCount = 0;
    const spaces = results.map(row => {
      totalVpValue += parseFloat(row.vp_value) || 0;
      votesCount += Number(row.votes_count);

      return {
        id: row.space,
        totalVpValue: parseFloat(row.vp_value) || 0,
        votesCount: Number(row.votes_count)
      };
    });

    return {
      user: addresses[0],
      totalVpValue,
      votesCount,
      spaces
    };
  } catch (err) {
    log.error(`[graphql] vp_value, ${JSON.stringify(err)}`);
    capture(err, { args });
    return Promise.reject(new Error('request failed'));
  }
}
