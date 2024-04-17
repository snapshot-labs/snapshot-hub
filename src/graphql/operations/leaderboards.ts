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
    vote_count: 'number',
    proposal_count: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'l', where);
  const defaultOrder = 'l.vote_count DESC, l.proposal_count DESC';

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
      users.created as userCreated
    FROM leaderboard l
    INNER JOIN spaces ON spaces.id = l.space
    INNER JOIN users ON users.id = l.user
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
