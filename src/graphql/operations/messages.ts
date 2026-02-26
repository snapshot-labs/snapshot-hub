import { sequencerDB } from '../../helpers/mysql';
import { buildWhereQuery, checkLimits } from '../helpers';

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'messages');

  const fields = {
    id: 'string',
    mci: 'number',
    address: 'string',
    timestamp: 'number',
    space: 'string',
    type: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 'm', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'timestamp';
  let orderDirection = args.orderDirection || 'desc';
  if (!['mci', 'timestamp'].includes(orderBy)) orderBy = 'mci';
  orderBy = `m.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT m.* FROM messages m
    WHERE id IS NOT NULL ${queryStr}
    ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);
  return await sequencerDB.queryAsync(query, params);
}
