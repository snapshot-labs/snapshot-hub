import { GraphQLError, Kind } from 'graphql';

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

export function sendError(res, description, status = 500) {
  return res.status(status).json({
    error: 'unauthorized',
    error_description: description
  });
}

export async function sleep(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

export const queryCountLimit = (
  maxQueryCount: number,
  maxSelectionCount: number | null = null
) => validationContext => {
  const { definitions } = validationContext.getDocument();
  const queries = definitions.reduce((map, definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      map[definition.name ? definition.name.value : ''] = definition;
    }
    return map;
  }, {});

  if (Object.keys(queries).length > maxQueryCount) {
    throw new GraphQLError(
      `The request exceeds the maximum number of query: ${maxQueryCount}`
    );
  }

  for (const name in queries) {
    if (
      queries[name].selectionSet.selections.length >
      (maxSelectionCount || maxQueryCount)
    ) {
      throw new GraphQLError(
        `${name} query exceeds the maximum number of root selections: ${maxQueryCount}`
      );
    }
  }
  return validationContext;
};
