import db from '../../helpers/mysql';
import { buildWhereQuery, formatSubscription } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  if (first > 1000) return Promise.reject('The `first` argument must not be greater than 1000');

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

  let { first = 20 } = args;
  const { skip = 0 } = args;

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
  } catch (e) {
    log.error(`[graphql] subscriptions, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
