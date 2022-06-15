import graphqlFields from 'graphql-fields';
import {
  fetchSpaces,
  fetchRelatedSpaces,
  mapRelatedSpaces,
  PublicError
} from '../helpers';

export default async function(_parent, { id }, _context, info) {
  if (!id) return new PublicError('Missing id');
  try {
    const requestedFields = info ? graphqlFields(info) : {};
    const spaces = await fetchSpaces({ first: 1, where: { id } });
    const relatedSpaces = await fetchRelatedSpaces(spaces, requestedFields);
    return mapRelatedSpaces(spaces, relatedSpaces)[0];
  } catch (e) {
    console.log('[graphql]', e);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
