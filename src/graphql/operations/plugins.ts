import { spaces } from '../../helpers/spaces';

export default function () {
  const plugins = {};
  Object.values(spaces).forEach((space: any) => {
    Object.keys(space.plugins || {}).forEach(plugin => {
      plugins[plugin] = (plugins[plugin] || 0) + 1;
    });
  });
  return Object.entries(plugins).map(plugin => ({
    id: plugin[0],
    spacesCount: plugin[1]
  }));
}
