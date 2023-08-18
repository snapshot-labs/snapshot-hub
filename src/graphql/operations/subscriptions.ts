import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatSubscription } from '../helpers';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'subscriptions');

  const fields = {
    id: 'string',
    ipfs: 'string',
    address: 'string',
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
    SELECT s.*, spaces.settings FROM subscriptions s
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
    capture(e, { contexts: { input: { args } } });
    return Promise.reject('request failed');
  }
}
