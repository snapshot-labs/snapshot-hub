import { checkLimits, fetchActiveSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

export default async function (_parent, args, _context, info) {
  checkLimits(args, 'activeSpaces');
  try {
    const { spaces, metrics } = await fetchActiveSpaces(args);
    const items = await handleRelatedSpaces(info, spaces);

    return { items, metrics };
  } catch (e) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
