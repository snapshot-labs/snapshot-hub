import db from '../../helpers/mysql';
import { buildWhereQuery, formatProposal } from '../helpers';
import log from '../../helpers/log';

const FIRST_LIMIT = 1000;
const SKIP_LIMIT = 5000;
const SPACE_IN_LIMIT = 20;

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  if (first > FIRST_LIMIT)
    return Promise.reject(`The \`first\` argument must not be greater than ${FIRST_LIMIT}`);
  if (skip > SKIP_LIMIT)
    return Promise.reject(`The \`skip\` argument must not be greater than ${SKIP_LIMIT}`);
  if (where.space_in?.length > SPACE_IN_LIMIT)
    return Promise.reject(
      `\`space_in\` argument length must not be greater than ${SPACE_IN_LIMIT}`
    );

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

  const query = `
    SELECT p.*, spaces.settings FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE spaces.settings IS NOT NULL ${queryStr} ${searchSql}
    ORDER BY ${orderBy} ${orderDirection}, p.id ASC LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    const proposals = await db.queryAsync(query, params);
    return proposals.map(proposal => formatProposal(proposal));
  } catch (e) {
    log.error(`[graphql] proposals, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
