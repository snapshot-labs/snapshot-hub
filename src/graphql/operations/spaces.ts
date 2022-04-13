import graphqlFields from 'graphql-fields';
import {
  fetchSpaces,
  fetchRelatedSpaces,
  mapRelatedSpaces,
  PublicError
} from '../helpers';

export default async function(_parent, args, _context, info) {
  try {
    const requestedFields = info ? graphqlFields(info) : {};
    const spaces = await fetchSpaces(args);
    const relatedSpaces = await fetchRelatedSpaces(spaces, requestedFields);
    return mapRelatedSpaces(spaces, relatedSpaces);
  } catch (e) {
    console.log('[graphql]', e);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
