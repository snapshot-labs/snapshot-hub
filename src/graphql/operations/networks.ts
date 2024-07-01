import { spaces } from '../../helpers/spaces';

export default function () {
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

  return Object.entries(networks).map(([id, spacesCount]) => ({
    id,
    spacesCount
  }));
}
