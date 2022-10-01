import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

export default async function (_parent, { id }, _context, info) {
  if (!id) return new PublicError('Missing id');
  try {
    let spaces = await fetchSpaces({ first: 1, where: { id } });
    if (spaces.length !== 1) return null;

    spaces = await handleRelatedSpaces(info, spaces);

    return spaces[0];
  } catch (e) {
    log.error(`[graphql] space, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
