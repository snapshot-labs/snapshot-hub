import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

export default async function (_parent, args, _context, info) {
  try {
    let spaces = await fetchSpaces(args);

    spaces = await handleRelatedSpaces(info, spaces);

    return spaces;
  } catch (e) {
    log.error('[graphql] spaces', e);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
