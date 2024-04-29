import db from '../../helpers/mysql';
import log from '../../helpers/log';
import { buildWhereQuery, checkLimits, formatLeaderboard } from '../helpers';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'leaderboards');

  const fields = {
    user: 'string',
    space: 'string',
    votesCount: 'number',
    proposalsCount: 'number'
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
      spaces.settings,
      spaces.flagged as spaceFlagged,
      spaces.verified as spaceVerified,
      spaces.turbo as spaceTurbo,
      spaces.hibernated as spaceHibernated,
      users.profile as userProfile,
      users.ipfs as userIpfs,
      users.created as userCreated,
      l.vote_count as votesCount,
      l.proposal_count as proposalsCount
    FROM leaderboard l
    INNER JOIN spaces ON BINARY spaces.id = BINARY l.space
    INNER JOIN users ON BINARY users.id = BINARY l.user
    WHERE spaces.settings IS NOT NULL ${whereQuery.query}
    ORDER BY ${
      orderBy ? `l.${orderBy} ${orderDirection}` : defaultOrder
    } LIMIT ?, ?
  `;

  try {
    const result = await db.queryAsync(query, [
      ...whereQuery.params,
      skip,
      first
    ]);

    return result.map(item => formatLeaderboard(item));
  } catch (e) {
    log.error(`[graphql] leaderboards, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
