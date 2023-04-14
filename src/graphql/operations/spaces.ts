import { checkLimits, fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';
import type { QueryArgs } from '../../types';

export default async function (parent: any, args: QueryArgs, context: any, info: any) {
  checkLimits(args, 'spaces');
  try {
    let spaces = await fetchSpaces(args);
    spaces = await handleRelatedSpaces(info, spaces);

    return spaces;
  } catch (e) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
