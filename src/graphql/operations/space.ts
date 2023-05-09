import { fetchSpace, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

export default async function (_parent, { id }, _context, info) {
  if (!id) return new PublicError('Missing id');
  try {
    const space = await fetchSpace(id);
    if (!space) return null;

    const relatedSpaces = await handleRelatedSpaces(info, [space]);
    return relatedSpaces[0];
  } catch (e) {
    log.error(`[graphql] space, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
