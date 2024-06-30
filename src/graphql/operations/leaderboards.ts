import db from '../../helpers/mysql';
import log from '../../helpers/log';
import { buildWhereQuery, checkLimits } from '../helpers';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'leaderboards');

  const fields = {
    user: 'string',
    space: 'string',
    vote_count: 'number',
    proposal_count: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'l', where);
  const defaultOrder = 'votesCount DESC, proposalsCount DESC';

  const orderBy = Object.keys(fields).includes(args.orderBy)
    ? args.orderBy
    : null;
  let orderDirection = (args.orderDirection || 'desc').toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT l.*,
      l.vote_count as votesCount,
      l.proposal_count as proposalsCount,
      l.last_vote as lastVote
    FROM leaderboard l
    WHERE 1=1 ${whereQuery.query}
    ORDER BY ${
      orderBy ? `l.${orderBy} ${orderDirection}` : defaultOrder
    } LIMIT ?, ?
  `;

  try {
    return db.queryAsync(query, [...whereQuery.params, skip, first]);
  } catch (e) {
    log.error(`[graphql] leaderboards, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
