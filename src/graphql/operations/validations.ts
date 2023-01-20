import { spaces } from '../../helpers/spaces';

export default function () {
  const validations = {};
  Object.values(spaces).forEach((space: any) => {
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
