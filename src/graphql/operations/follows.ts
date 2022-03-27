import db from '../../helpers/mysql';
import { buildWhereQuery, formatFollow } from '../helpers';

export default async function(parent, args) {
  let { where = {} } = args;

  const fields = {
    id: 'string',
    ipfs: 'string',
    follower: 'string',
    following: 'string',
    created: 'number',
    type: 'string'
  };

  // Assuming its a deprecated query, we need to default it to space.
  if (!where.type) {
    where = {
      ...where,
      type: 'space'
    };
  }

  // Assuming its a deprecated query, we need to remove space from where and add the value to following as space is renamed to following.
  if (where.space) {
    where = {
      ...where,
      following: where.space
    };
    delete where.space;
  }

  const whereQuery = buildWhereQuery(fields, 'f', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created'].includes(orderBy)) orderBy = 'created';
  orderBy = `f.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 1000) first = 1000;
  params.push(skip, first);

  let follows: any[] = [];

  // Left join for cases where type is an account and we dont have space id.
  const query = `
    SELECT f.*, spaces.settings FROM follows f
    LEFT JOIN spaces ON spaces.id = f.following
    WHERE 1 = 1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;

  try {
    follows = await db.queryAsync(query, params);
    return follows.map(follow => {
      if (follow.type === 'space') return formatFollow(follow);
      return follow;
    });
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
