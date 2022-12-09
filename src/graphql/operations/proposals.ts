import db from '../../helpers/mysql';
import { buildWhereQuery, formatProposal } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, args) {
  const { where = {} } = args;

  if (where.space_in) return [];

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    author: 'string',
    network: 'string',
    created: 'number',
    start: 'number',
    end: 'number',
    type: 'string',
    scores_state: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 'p', where);
  let queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  const ts = parseInt((Date.now() / 1e3).toFixed());
  const state = where.state || null;
  if (state === 'pending') {
    queryStr += 'AND p.start > ? ';
    params.push(ts);
  } else if (state === 'active') {
    queryStr += 'AND p.start < ? AND p.end > ? ';
    params.push(ts, ts);
  } else if (state === 'closed') {
    queryStr += 'AND p.end < ? ';
    params.push(ts);
  }

  let searchSql = '';
  if (where.title_contains) {
    searchSql = 'AND p.title LIKE ?';
    params.push(`%${where.title_contains}%`);
  }

  if (where.strategies_contains) {
    searchSql += ' AND p.strategies LIKE ?';
    params.push(`%${where.strategies_contains}%`);
  }

  if (where.validation) {
    searchSql += ' AND p.validation LIKE ?';
    params.push(`%"name": "${where.validation}"%`);
  }

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'start', 'end'].includes(orderBy)) orderBy = 'created';
  orderBy = `p.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let { first = 20, skip = 0 } = args;
  if (first > 1000) first = 1000;
  if (skip > 5000) skip = 5000;
  params.push(skip, first);

  const query = `
    SELECT p.*, spaces.settings FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE spaces.settings IS NOT NULL ${queryStr} ${searchSql}
    ORDER BY ${orderBy} ${orderDirection}, p.id ASC LIMIT ?, ?
  `;
  try {
    const proposals = await db.queryAsync(query, params);
    return proposals.map(proposal => formatProposal(proposal));
  } catch (e) {
    log.error(`[graphql] proposals, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
