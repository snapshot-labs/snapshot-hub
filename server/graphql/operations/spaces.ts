import db from '../../helpers/mysql';
import { formatSpace } from '../helpers';

export default async function(parent, args) {
  const params: any[] = [];

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
    WHERE settings IS NOT NULL
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
