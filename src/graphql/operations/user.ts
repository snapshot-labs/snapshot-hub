import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';
import log from '../../helpers/log';
import { formatUser, formatAddresses, PublicError } from '../helpers';

export default async function (parent, args) {
  const addresses = formatAddresses(
    [args.id],
    ['evmAddress', 'starknetAddress']
  );
  if (!addresses.length) throw new PublicError('Invalid address');

  const query = `SELECT u.* FROM users u WHERE id = ? LIMIT 1`;
  try {
    const users = await db.queryAsync(query, addresses[0]);
    if (users.length === 1) return formatUser(users[0]);
    return null;
  } catch (e: any) {
    log.error(`[graphql] user, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
