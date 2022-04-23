import db from '../../helpers/mysql';
import { formatSpace } from '../helpers';

export default async function(_parent, args) {
  const { where = {} } = args;
  let queryStr = '';
  const params: any[] = [];

  const fields = ['id'];
  fields.forEach(field => {
    if (where[field]) {
      queryStr += `AND s.${field} = ? `;
      params.push(where[field]);
    }
    const fieldIn = where[`${field}_in`] || [];
    if (fieldIn.length > 0) {
      queryStr += `AND s.${field} IN (?) `;
      params.push(fieldIn);
    }
  });

  let orderBy = args.orderBy || 'created_at';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created_at', 'updated_at', 'id'].includes(orderBy))
    orderBy = 'created_at';
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 1000) first = 1000;
  params.push(skip, first);

  const query = `
    SELECT s.* FROM spaces s
    WHERE 1 = 1 ${queryStr}
    GROUP BY s.id
    ORDER BY s.${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    const spaces = await db.queryAsync(query, params);
    return spaces.map(space =>
      Object.assign(space, formatSpace(space.id, space.settings, space.domain))
    );
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
