import { spaces } from '../../helpers/spaces';

export default function () {
  const skins = {};
  Object.values(spaces).forEach((space: any) => {
    if (space.skin) skins[space.skin] = skins[space.skin] ? skins[space.skin] + 1 : 1;
  });
  return Object.entries(skins).map((skin) => ({
    id: skin[0],
    spacesCount: skin[1]
  }));
}
