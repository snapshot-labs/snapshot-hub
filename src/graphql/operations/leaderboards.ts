import { capture } from '@snapshot-labs/snapshot-sentry';
import uniq from 'lodash/uniq';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits } from '../helpers';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'leaderboards');

  const ORDER_FIELDS = [
    'vote_count',
    'proposal_count',
    'last_vote',
    'user',
    'vp_value'
  ];
  const DEFAULT_ORDER_FIELD = 'vote_count';

  const fields = {
    user: ['evmAddress', 'starknetAddress'],
    space: 'string',
    last_vote: 'number',
    vote_count: 'number',
    proposal_count: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'l', where);

  const orderBy = uniq([...Object.keys(fields), ...ORDER_FIELDS]).includes(
    args.orderBy
  )
    ? args.orderBy
    : DEFAULT_ORDER_FIELD;
  let orderDirection = (args.orderDirection || 'desc').toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  // Use a single extra field for deterministic ordering
  // depending on the realm (space or user)
  // This covers 100% of our use cases
  // When neither space nor user filters are present (not coming from our UI),
  // use last_vote as the secondary ordering field for consistency.
  const orderFields = [orderBy];
  if (where.space) {
    orderFields.push('user');
  } else if (where.user) {
    orderFields.push('space');
  } else {
    orderFields.push('last_vote');
  }

  const orderQuery = uniq(orderFields)
    .map((field: string) => `l.${field} ${orderDirection}`)
    .join(', ');

  const query = `
    SELECT l.*,
      l.vote_count as votesCount,
      l.proposal_count as proposalsCount,
      l.last_vote as lastVote,
      l.vp_value as vpValue
    FROM leaderboard l
    WHERE 1=1 ${whereQuery.query}
    ORDER BY ${orderQuery} LIMIT ?, ?
  `;

  try {
    return db.queryAsync(query, [...whereQuery.params, skip, first]);
  } catch (e) {
    log.error(`[graphql] leaderboards, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
