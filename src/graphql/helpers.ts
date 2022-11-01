import graphqlFields from 'graphql-fields';
import { jsonParse } from '../helpers/utils';
import { spaceProposals, spaceFollowers } from '../helpers/spaces';
import db from '../helpers/mysql';

const network = process.env.NETWORK || 'testnet';

export class PublicError extends Error {}

export function formatSpace(id, settings) {
  const space = jsonParse(settings, {});
  space.id = id;
  space.private = space.private || false;
  space.avatar = space.avatar || '';
  space.about = space.about || '';
  space.categories = space.categories || [];
  space.admins = space.admins || [];
  space.members = space.members || [];
  space.plugins = space.plugins || {};
  space.filters = space.filters || {};
  space.filters.minScore = space.filters.minScore || 0;
  space.filters.onlyMembers = space.filters.onlyMembers || false;
  space.voting = space.voting || {};
  space.voting.delay = space.voting.delay || null;
  space.voting.period = space.voting.period || null;
  space.voting.type = space.voting.type || null;
  space.voting.quorum = space.voting.quorum || null;
  space.voting.blind = space.voting.blind || false;
  space.voting.privacy = space.voting.privacy || '';
  space.voting.aliased = space.voting.aliased || false;
  space.followersCount = spaceFollowers[id]?.count || 0;
  space.proposalsCount = spaceProposals[id]?.count || 0;
  space.voting.hideAbstain = space.voting.hideAbstain || false;
  space.voteValidation = space.voteValidation || { name: 'any' };
  space.validation = space.validation || { name: 'basic', params: {} };
  space.strategies = space.strategies?.map(strategy => ({
    ...strategy,
    // By default return space network if strategy network is not defined
    network: strategy.network || space.network
  }));
  space.treasuries = space.treasuries || [];

  // always return parent and children in child node format
  // will be overwritten if other fields than id are requested
  space.parent = space.parent ? { id: space.parent } : null;
  space.children = space.children?.map(child => ({ id: child })) || [];

  return space;
}

export function buildWhereQuery(fields, alias, where) {
  let query: any = '';
  const params: any[] = [];
  Object.entries(fields).forEach(([field, type]) => {
    if (where[field]) {
      query += `AND ${alias}.${field} = ? `;
      params.push(where[field]);
    }
    const fieldIn = where[`${field}_in`] || [];
    if (fieldIn.length > 0) {
      query += `AND ${alias}.${field} IN (?) `;
      params.push(fieldIn);
    }
    if (type === 'number') {
      const fieldGt = where[`${field}_gt`];
      const fieldGte = where[`${field}_gte`];
      const fieldLt = where[`${field}_lt`];
      const fieldLte = where[`${field}_lte`];
      if (fieldGt) {
        query += `AND ${alias}.${field} > ? `;
        params.push(fieldGt);
      }
      if (fieldGte) {
        query += `AND ${alias}.${field} >= ? `;
        params.push(fieldGte);
      }
      if (fieldLt) {
        query += `AND ${alias}.${field} < ? `;
        params.push(fieldLt);
      }
      if (fieldLte) {
        query += `AND ${alias}.${field} <= ? `;
        params.push(fieldLte);
      }
    }
  });
  return { query, params };
}

export async function fetchSpaces(args) {
  const { where = {} } = args;

  const fields = { id: 'string' };
  const whereQuery = buildWhereQuery(fields, 's', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created_at';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created_at', 'updated_at', 'id'].includes(orderBy)) orderBy = 'created_at';
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

  const spaces = await db.queryAsync(query, params);
  return spaces.map(space => Object.assign(space, formatSpace(space.id, space.settings)));
}

function checkRelatedSpacesNesting(requestedFields): void {
  // for a children's parent or a parent's children, you can ONLY query id
  // (for the purpose of easier cross-checking of relations in frontend)
  // other than that, deeper nesting is not supported
  if (
    (requestedFields.parent?.children &&
      Object.keys(requestedFields.parent.children).some(key => key !== 'id')) ||
    (requestedFields.children?.parent &&
      Object.keys(requestedFields.children.parent).some(key => key !== 'id'))
  ) {
    throw new PublicError(
      "Unsupported nesting. Only the id field can be queried for children's parents or parent's children."
    );
  }

  if (requestedFields.parent?.parent || requestedFields.children?.children) {
    throw new PublicError(
      "Unsupported nesting. Parent's parent or children's children are not supported."
    );
  }
}

function needsRelatedSpacesData(requestedFields): boolean {
  // id's of parent/children are already included in the result from fetchSpaces
  // an additional query is only needed if other fields are requested
  if (
    !(requestedFields.parent && Object.keys(requestedFields.parent).some(key => key !== 'id')) &&
    !(requestedFields.children && Object.keys(requestedFields.children).some(key => key !== 'id'))
  ) {
    return false;
  }

  return true;
}

function mapRelatedSpacesToSpaces(spaces, relatedSpaces) {
  if (!relatedSpaces.length) return spaces;

  return spaces.map(space => {
    if (space.children) {
      space.children = space.children
        .map(c => relatedSpaces.find(s => s.id === c.id) || c)
        .filter(s => s);
    }
    if (space.parent) {
      space.parent = relatedSpaces.find(s => s.id === space.parent.id) || space.parent;
    }
    return space;
  });
}

async function fetchRelatedSpaces(spaces) {
  // collect all parent and child ids of all spaces
  const relatedSpaceIDs = spaces.reduce((ids, space) => {
    if (space.children) ids.push(...space.children.map(c => c.id));
    if (space.parent) ids.push(space.parent.id);
    return ids;
  }, []);

  return await fetchSpaces({
    where: { id_in: relatedSpaceIDs }
  });
}

export async function handleRelatedSpaces(info: any, spaces: any[]) {
  const requestedFields = info ? graphqlFields(info) : {};
  if (needsRelatedSpacesData(requestedFields)) {
    checkRelatedSpacesNesting(requestedFields);
    const relatedSpaces = await fetchRelatedSpaces(spaces);
    spaces = mapRelatedSpacesToSpaces(spaces, relatedSpaces);
  }
  return spaces;
}

export function formatUser(user) {
  const profile = jsonParse(user.profile, {});
  delete user.profile;
  return {
    ...user,
    ...profile
  };
}

export function formatProposal(proposal) {
  proposal.choices = jsonParse(proposal.choices, []);
  proposal.strategies = jsonParse(proposal.strategies, []);
  proposal.validation = jsonParse(proposal.validation, { name: 'any' });
  proposal.plugins = jsonParse(proposal.plugins, {});
  proposal.scores = jsonParse(proposal.scores, []);
  proposal.scores_by_strategy = jsonParse(proposal.scores_by_strategy, []);
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  proposal.space = formatSpace(proposal.space, proposal.settings);
  const networkStr = network === 'testnet' ? 'demo.' : '';
  proposal.link = `https://${networkStr}snapshot.org/#/${proposal.space.id}/proposal/${proposal.id}`;
  proposal.strategies = proposal.strategies.map(strategy => ({
    ...strategy,
    // By default return proposal network if strategy network is not defined
    network: strategy.network || proposal.network
  }));
  proposal.privacy = proposal.privacy || '';
  return proposal;
}

export function formatVote(vote) {
  vote.choice = jsonParse(vote.choice);
  vote.metadata = {};
  vote.vp_by_strategy = jsonParse(vote.vp_by_strategy, []);
  vote.space = formatSpace(vote.space, vote.settings);
  return vote;
}

export function formatFollow(follow) {
  follow.space = formatSpace(follow.space, follow.settings);
  return follow;
}

export function formatSubscription(subscription) {
  subscription.space = formatSpace(subscription.space, subscription.settings);
  return subscription;
}
