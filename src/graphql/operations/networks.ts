import { spaces } from '../../helpers/spaces';
import { Countable } from '../../types';

export default function () {
  const networks: Countable = {};
  Object.values(spaces).forEach(space => {
    if (space.network) {
      networks[space.network] = networks[space.network] ? networks[space.network] + 1 : 1;
    }
  });
  return Object.entries(networks).map(network => ({
    id: network[0],
    spacesCount: network[1]
  }));
}
