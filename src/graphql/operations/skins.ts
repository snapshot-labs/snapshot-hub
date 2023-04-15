import { spaces } from '../../helpers/spaces';
import { Countable } from '../../types';

export default function () {
  const skins: Countable = {};
  Object.values(spaces).forEach(space => {
    if (space.skin) skins[space.skin] = skins[space.skin] ? skins[space.skin] + 1 : 1;
  });
  return Object.entries(skins).map(skin => ({
    id: skin[0],
    spacesCount: skin[1]
  }));
}
