import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import { fetchSpaces, handleRelatedSpaces, PublicError } from '../helpers';

export default async function (_parent, { id }, context, info) {
  try {
    let spaces = await fetchSpaces({ first: 1, where: { id } });
    if (spaces.length !== 1) return null;

    spaces = await handleRelatedSpaces(info, spaces);

    return spaces[0];
  } catch (e: any) {
    log.error(`[graphql] space, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    capture(e, { id, context, info });
    return new Error('Unexpected error');
  }
}
