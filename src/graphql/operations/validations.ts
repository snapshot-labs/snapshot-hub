import { spaces } from '../../helpers/spaces';
import type { Countable } from '../../types';

export default function () {
  const validations: Countable = {};
  Object.values(spaces).forEach(space => {
    if (space.validation)
      validations[space.validation.name] = validations[space.validation.name]
        ? validations[space.validation.name] + 1
        : 1;
  });
  return Object.entries(validations).map(validation => ({
    id: validation[0],
    spacesCount: validation[1]
  }));
}
