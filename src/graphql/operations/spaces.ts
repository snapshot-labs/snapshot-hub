import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';

const FIRST_LIMIT = 1000;
const SKIP_LIMIT = 15000;

export default async function (_parent, args, _context, info) {
  try {
    const { first = 20, skip = 0 } = args;

    if (first > FIRST_LIMIT)
      return Promise.reject(`The \`first\` argument must not be greater than ${FIRST_LIMIT}`);
    if (skip > SKIP_LIMIT)
      return Promise.reject(`The \`skip\` argument must not be greater than ${SKIP_LIMIT}`);

    let spaces = await fetchSpaces(args);
    spaces = await handleRelatedSpaces(info, spaces);

    return spaces;
  } catch (e) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
