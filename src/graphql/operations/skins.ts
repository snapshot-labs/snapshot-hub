import { spacesMetadata } from '../../helpers/spaces';

export default function getSkins() {
  const skins: Record<string, number> = {};

  for (const { skin } of Object.values(spacesMetadata)) {
    if (skin) {
      skins[skin] = (skins[skin] || 0) + 1;
    }
  }

  return Object.entries(skins).map(([id, spacesCount]) => ({
    id,
    spacesCount
  }));
}
