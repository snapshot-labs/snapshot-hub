import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

export default async function (_parent, args, _context, info) {
  try {
    const { first = 20, skip = 0 } = args;
    if (first > 1000) return Promise.reject('The `first` argument must not be greater than 1000');
    if (skip > 20000) return Promise.reject('The `skip` argument must not be greater than 20000');

    let spaces = await fetchSpaces(args);

    spaces = await handleRelatedSpaces(info, spaces);

    return spaces;
  } catch (e) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
