import utils from '@snapshot-labs/snapshot.js/src/utils';
import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';
import { formatUser } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, args) {
  const id = utils.getFormattedAddress(args.id);
  const query = `SELECT u.* FROM users u WHERE id = ? LIMIT 1`;
  try {
    const users = await db.queryAsync(query, id);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e: any) {
    log.error(`[graphql] user, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
