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

  let { first = 20 } = args;
  const { skip = 0 } = args;
  if (first > 100) first = 100;
  params.push(skip, first);

  const query = `
    SELECT * FROM spaces
    WHERE 1 = 1 ${queryStr}
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
