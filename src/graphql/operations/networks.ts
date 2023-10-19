import { capture } from '@snapshot-labs/snapshot-sentry';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import db from '../../helpers/mysql';

export default async function () {
  const query = `
    SELECT
      JSON_UNQUOTE(JSON_EXTRACT(settings, '$.network')) as network,
      COUNT(name) AS count
    FROM spaces
    GROUP BY network
    ORDER BY count DESC;
  `;

  try {
    const results = new Map(await db.queryAsync(query).map(r => [r.network, r.count]));

    return Object.values(networks)
      .map((network: any) => {
        network.id = network.key;
        network.spacesCount = results.get(network.id) || 0;
        network.testnet ||= false;
        return network;
      })
      .sort((a, b) => b.spacesCount - a.spacesCount);
  } catch (e: any) {
    capture(e);
    return Promise.reject(new Error('request failed'));
  }
}
