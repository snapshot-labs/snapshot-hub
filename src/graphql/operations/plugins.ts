import { spaces } from '../../helpers/spaces';
import { Countable } from '../../types';

export default function () {
  const plugins: Countable = {};
  Object.values(spaces).forEach(space => {
    Object.keys(space.plugins || {}).forEach(plugin => {
      plugins[plugin] = plugins[plugin] ? plugins[plugin] + 1 : 1;
    });
  });
  return Object.entries(plugins).map(network => ({
    id: network[0],
    spacesCount: network[1]
  }));
}
