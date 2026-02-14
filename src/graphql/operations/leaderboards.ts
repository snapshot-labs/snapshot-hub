import uniq from 'lodash/uniq';
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

  const orderQuery = uniq([orderBy, ...ORDER_FIELDS])
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

  return db.queryAsync(query, [...whereQuery.params, skip, first]);
}
