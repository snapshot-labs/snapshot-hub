import { spaces } from '../../helpers/spaces';

export default function () {
  const plugins: { [key: string]: number } = {};
  Object.values(spaces).forEach((space: any) => {
    Object.keys(space.plugins || {}).forEach(plugin => {
      plugins[plugin] = plugins[plugin] ? plugins[plugin] + 1 : 1;
    });
  });
  return Object.entries(plugins).map(network => ({
    id: network[0],
    spacesCount: network[1]
  }));
}
