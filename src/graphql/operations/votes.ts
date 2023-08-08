import graphqlFields from 'graphql-fields';
import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits, formatProposal, formatSpace, formatVote } from '../helpers';
import serve from '../../helpers/requestDeduplicator';
import log from '../../helpers/log';
import { capture } from '@snapshot-labs/snapshot-sentry';

async function query(parent, args, context?, info?) {
  const requestedFields = info ? graphqlFields(info) : {};
  const { where = {}, first = 20, skip = 0 } = args;

  checkLimits(args, 'votes');

  const fields = {
    id: 'string',
    ipfs: 'string',
    space: 'string',
    voter: 'string',
    proposal: 'string',
    reason: 'string',
    app: 'string',
    created: 'number',
    vp: 'number',
    vp_state: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 'v', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'vp'].includes(orderBy)) orderBy = 'created';
  orderBy = `v.${orderBy}`;
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  let votes: any[] = [];

  const query = `
    SELECT v.* FROM votes v
    WHERE 1 = 1 ${queryStr}
    ORDER BY ${orderBy} ${orderDirection}, v.id ASC LIMIT ?, ?
  `;
  params.push(skip, first);
  try {
    votes = await db.queryAsync(query, params);
    // TODO: we need settings in the vote as its being passed to formatSpace inside formatVote, Maybe we dont need to do this?
    votes = votes.map(vote => formatVote(vote));
  } catch (e: any) {
    capture(e);
    log.error(`[graphql] votes, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }

  if (requestedFields.space && votes.length > 0) {
    const spaceIds = votes.map(vote => vote.space.id).filter((v, i, a) => a.indexOf(v) === i);
    const query = `
      SELECT id, settings FROM spaces
      WHERE id IN (?) AND settings IS NOT NULL AND deleted = 0
    `;
    try {
      let spaces = await db.queryAsync(query, [spaceIds]);

      spaces = Object.fromEntries(
        spaces.map(space => [space.id, formatSpace(space.id, space.settings)])
      );
      votes = votes.map(vote => {
        if (spaces[vote.space.id]) return { ...vote, space: spaces[vote.space.id] };
        return vote;
      });
    } catch (e: any) {
      capture(e);
      log.error(`[graphql] votes, ${JSON.stringify(e)}`);
      return Promise.reject('request failed');
    }
  }

  if (requestedFields.proposal && votes.length > 0) {
    const proposalIds = votes.map(vote => vote.proposal);
    const query = `
      SELECT p.*, spaces.settings FROM proposals p
      INNER JOIN spaces ON spaces.id = p.space
      WHERE spaces.settings IS NOT NULL AND p.id IN (?)
    `;
    try {
      let proposals = await db.queryAsync(query, [proposalIds]);
      proposals = Object.fromEntries(
        proposals.map(proposal => [proposal.id, formatProposal(proposal)])
      );
      votes = votes.map(vote => {
        vote.proposal = proposals[vote.proposal];
        return vote;
      });
    } catch (e: any) {
      capture(e);
      log.error(`[graphql] votes, ${JSON.stringify(e)}`);
      return Promise.reject('request failed');
    }
  }

  return votes;
}

export default async function (parent, args, context?, info?) {
  const requestedFields = info ? graphqlFields(info) : {};
  return await serve(JSON.stringify({ args, requestedFields }), query, [
    parent,
    args,
    context,
    info
  ]);
}
