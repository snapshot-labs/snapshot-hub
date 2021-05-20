import db from '../../helpers/mysql';
import { formatSpace } from '../helpers';

export default async function(parent, args) {
  const { where = {} } = args;
  let queryStr = '';
  const params: any[] = [];

  const fields = ['id'];
  fields.forEach(field => {
    if (where[field]) {
      queryStr += `AND ${field} = ? `;
      params.push(where[field]);
    }
    const fieldIn = where[`${field}_in`] || [];
    if (fieldIn.length > 0) {
      queryStr += `AND ${field} IN (?) `;
      params.push(fieldIn);
    }
  });

  let orderBy = args.orderBy || 'created_at';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created_at', 'updated_at', 'id'].includes(orderBy))
    orderBy = 'created_at';
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const { first = 20, skip = 0 } = args;
  params.push(skip, first);

  const query = `
    SELECT * FROM spaces
    WHERE settings IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  try {
    const spaces = await db.queryAsync(query, params);
    return spaces.map(space => formatSpace(space.id, space.settings));
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
  }
}
