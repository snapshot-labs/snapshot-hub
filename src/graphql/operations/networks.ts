import db from '../../helpers/mysql';
import { networkSpaceCounts } from '../../helpers/spaces';

export default async function (): Promise<any[]> {
  let networks = await db.queryAsync('SELECT * FROM networks');

  networks = networks.map(network => ({
    ...network,
    premium: !!network.premium,
    spacesCount: networkSpaceCounts[network.id] || 0
  }));

  return networks;
}
