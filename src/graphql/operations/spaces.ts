import graphqlFields from 'graphql-fields';
import {
  fetchSpaces,
  addRelatedSpaces,
  PublicError,
  needsFetchRelatedSpaces
} from '../helpers';

export default async function(_parent, args, _context, info) {
  try {
    let spaces = await fetchSpaces(args);

    const requestedFields = info ? graphqlFields(info) : {};
    if (needsFetchRelatedSpaces(requestedFields)) {
      spaces = await addRelatedSpaces(spaces);
    }

    return spaces;
  } catch (e) {
    console.log('[graphql]', e);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
