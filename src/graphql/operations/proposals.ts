import db from '../../helpers/mysql';
import { buildWhereQuery, formatProposal, checkLimits } from '../helpers';
import log from '../../helpers/log';
import { flaggedProposals, verifiedSpaces } from '../../helpers/moderation';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (parent, args) {
  const { first = 20, skip = 0, where = {} } = args;

  checkLimits(args, 'proposals');

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    author: 'string',
    network: 'string',
    created: 'number',
    updated: 'number',
    app: 'string',
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

  if (where.plugins_contains) {
    searchSql += ' AND p.plugins LIKE ?';
    params.push(`%${where.plugins_contains}%`);
  }

  if (where.validation) {
    searchSql += ' AND p.validation LIKE ?';
    params.push(`%"name": "${where.validation}"%`);
  }

  if (where.space_verified && verifiedSpaces.length > 0) {
    searchSql += ' AND spaces.id in (?)';
    params.push(verifiedSpaces);
  }

  // TODO: remove part `p.id IN (?)` when flagged proposals are moved from laser DB to snapshot-sequencer DB
  if (where.flagged === true && flaggedProposals.length > 0) {
    searchSql += ' AND (p.id IN (?) OR p.flagged = 1)';
    params.push(flaggedProposals);
  }

  // TODO: remove part `p.id NOT IN (?)` when flagged proposals are moved from laser DB to snapshot-sequencer DB
  if (where.flagged === false && flaggedProposals.length > 0) {
    searchSql += ' AND (p.id NOT IN (?) AND p.flagged = 0)';
    params.push(flaggedProposals);
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
  } catch (e: any) {
    log.error(`[graphql] proposals, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject('request failed');
  }
}
