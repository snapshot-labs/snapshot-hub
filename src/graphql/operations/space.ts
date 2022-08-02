import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';

export default async function(_parent, { id, domain }, _context, info) {
  let where;
  if (id) {
    where = { id };
  } else if (domain) {
    where = { domain };
  } else {
    return new PublicError('Missing id or domain.');
  }

  try {
    let spaces = await fetchSpaces({ first: 1, where });
    if (spaces.length !== 1) return null;

    spaces = await handleRelatedSpaces(info, spaces);

    return spaces[0];
  } catch (e) {
    console.log('[graphql]', e);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
