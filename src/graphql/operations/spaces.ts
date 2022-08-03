import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';

export default async function (_parent, args, _context, info) {
  try {
    let spaces = await fetchSpaces(args);

    spaces = await handleRelatedSpaces(info, spaces);

    return spaces;
  } catch (e) {
    console.log('[graphql]', e);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
