import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import {
  checkLimits,
  fetchSpaces,
  handleRelatedSpaces,
  PublicError
} from '../helpers';

export default async function (_parent, args, context, info) {
  checkLimits(args, 'spaces');
  try {
    let spaces = await fetchSpaces(args);
    spaces = await handleRelatedSpaces(info, spaces);

    return spaces;
  } catch (e: any) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    capture(e, { args, context, info });
    return new Error('Unexpected error');
  }
}
