import db from '../../helpers/mysql';
import { spaces } from '../../helpers/spaces';

export default async function () {
  const networks: any = Object.values(spaces).reduce((acc: any, space: any) => {
    const spaceNetworks = [
      space.network,
      ...space.strategies.map((strategy: any) => strategy.network),
      ...space.strategies.flatMap((strategy: any) =>
        Array.isArray(strategy.params?.strategies)
          ? strategy.params.strategies.map((param: any) => param.network)
          : []
      )
    ];

    // remove undefined and duplicates
    const uniqueNetworks = [...new Set(spaceNetworks)].filter(Boolean);

    uniqueNetworks.forEach(network => {
      acc[network] = acc[network] ? acc[network] + 1 : 1;
    });

    return acc;
  }, {});

  const results = Object.entries(networks).reduce((acc, [id, spacesCount]) => {
    acc[id] = {
      id,
      spacesCount: spacesCount,
      premium: false
    };

    return acc;
  }, {});

  const premiumNetworks = await db.queryAsync(
    'SELECT * FROM networks WHERE premium = 1'
  );
  premiumNetworks.forEach((network: any) => {
    results[network.id] ||= { id: network.id, spacesCount: 0 };
    results[network.id].premium = true;
  });

  return Object.values(results);
}
