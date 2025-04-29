import { capture } from '@snapshot-labs/snapshot-sentry';
import fetchVotes from './votes';
import log from '../../helpers/log';

export default async function (parent, { id }, context, info) {
  try {
    const votes = await fetchVotes(
      parent,
      { first: 1, skip: 0, where: { id } },
      context,
      info
    );
    if (votes.length !== 1) return null;
    return votes[0];
  } catch (e: any) {
    log.error(`[graphql] vote, ${JSON.stringify(e)}`);
    capture(e, { id, context, info });
    return Promise.reject(new Error('request failed'));
  }
}
