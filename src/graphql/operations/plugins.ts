import { spacesMetadata } from '../../helpers/spaces';

export default function getPluginsUsage() {
  const pluginUsageCount: Record<string, number> = {};

  for (const { pluginNames } of Object.values(spacesMetadata)) {
    for (const plugin of pluginNames) {
      pluginUsageCount[plugin] = (pluginUsageCount[plugin] || 0) + 1;
    }
  }

  return Object.entries(pluginUsageCount).map(([id, spacesCount]) => ({
    id,
    spacesCount
  }));
}
