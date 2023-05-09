import { checkLimits, fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

export default async function (_parent, args, _context, info) {
  checkLimits(args, 'spaces');
  try {
    const { spaces, total } = await fetchSpaces(args);
    const items = await handleRelatedSpaces(info, spaces);

    return { items, total };
  } catch (e) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
