import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatSubscription } from '../helpers';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'subscriptions');

  const fields = {
    id: 'string',
    ipfs: 'string',
    address: 'evmAddress',
    space: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 's', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `s.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let subscriptions: any[] = [];

  const query = `
    SELECT s.*,
      spaces.settings,
      spaces.flagged as spaceFlagged,
      spaces.verified as spaceVerified,
      spaces.turbo as spaceTurbo,
      spaces.hibernated as spaceHibernated
    FROM subscriptions s
    INNER JOIN spaces ON spaces.id = s.space
    WHERE spaces.settings IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);

  try {
    subscriptions = await db.queryAsync(query, params);
    return subscriptions.map(subscription => formatSubscription(subscription));
  } catch (e: any) {
    log.error(`[graphql] subscriptions, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
