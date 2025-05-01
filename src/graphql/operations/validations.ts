import { spacesMetadata } from '../../helpers/spaces';

export default function getValidations() {
  const validations: Record<string, number> = {};

  for (const { validationName } of Object.values(spacesMetadata)) {
    if (validationName) {
      validations[validationName] = (validations[validationName] || 0) + 1;
    }
  }

  return Object.entries(validations).map(([id, spacesCount]) => ({
    id,
    spacesCount
  }));
}
