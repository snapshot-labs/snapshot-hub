import { spaces } from '../../helpers/spaces';

export default function () {
  const networks: { [key: string]: number } = {};
  Object.values(spaces).forEach(space => {
    networks[space.network] = networks[space.network] ? networks[space.network] + 1 : 1;
  });
  return Object.entries(networks).map(network => ({
    id: network[0],
    spacesCount: network[1]
  }));
}
