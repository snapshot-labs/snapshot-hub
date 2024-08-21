import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatFollow } from '../helpers';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'follows');

  const fields = {
    id: 'string',
    ipfs: 'string',
    follower: ['evmAddress', 'starknetAddress'],
    space: 'string',
    network: 'string',
    created: 'number'
  };
  const whereQuery = buildWhereQuery(fields, 'f', where);
  const queryStr = whereQuery.query;
  const params = whereQuery.params.concat(skip, first);

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `f.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT f.*,
      spaces.settings,
      spaces.flagged as spaceFlagged,
      spaces.verified as spaceVerified,
      spaces.turbo as spaceTurbo,
      spaces.hibernated as spaceHibernated
    FROM follows f
    LEFT JOIN spaces ON spaces.id = f.space
    WHERE 1=1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;

  try {
    const follows = await db.queryAsync(query, params);
    return follows.map(follow => formatFollow(follow));
  } catch (e: any) {
    log.error(`[graphql] follows, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
