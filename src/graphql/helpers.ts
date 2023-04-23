import graphqlFields from 'graphql-fields';
import { jsonParse } from '../helpers/utils';
import { spaceProposals, spaceFollowers } from '../helpers/spaces';
import db from '../helpers/mysql';

import type {
  Strategy,
  QueryArgs,
  Countable,
  SqlRow,
  User,
  Subscription,
  Follow,
  Vote,
  Proposal,
  Space
} from '../types';

type QueryFields = { [key: string]: string };

const network = process.env.NETWORK || 'testnet';

export class PublicError extends Error {}

const ARG_LIMITS: { [key: string]: Countable } = {
  default: {
    first: 1000,
    skip: 5000
  },
  proposals: {
    space_in: 10000
  },
  spaces: {
    skip: 15000
  }
};

export function checkLimits(args: QueryArgs, type: string) {
  const { where = {} } = args;
  const typeLimits = { ...ARG_LIMITS.default, ...(ARG_LIMITS[type] || {}) };

  for (const key in typeLimits) {
    const limit = typeLimits[key];
    const firstLimitReached = key === 'first' && args[key] > limit;
    const skipLimitReached = key === 'skip' && args[key] > limit;
    const whereLimitReached = key.endsWith('_in') ? where[key]?.length > limit : where[key] > limit;
    if (firstLimitReached || skipLimitReached || whereLimitReached)
      throw new Error(`The \`${key}\` argument must not be greater than ${limit}`);
  }
  return true;
}

export function formatSpace(id: string, settings: string) {
  const space = jsonParse(settings, {});
  space.id = id;
  space.private = space.private || false;
  space.avatar = space.avatar || '';
  space.about = space.about || '';
  space.categories = space.categories || [];
  space.admins = space.admins || [];
  space.moderators = space.moderators || [];
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
  space.voteValidation = space.voteValidation || { name: 'any', params: {} };
  space.strategies = space.strategies?.map((strategy: Strategy) => ({
    ...strategy,
    // By default return space network if strategy network is not defined
    network: strategy.network || space.network
  }));
  if (!space.validation && space.filters.minScore) {
    space.validation = {
      name: 'basic',
      params: { minScore: space.filters.minScore, strategies: space.strategies }
    };
  }
  space.validation = space.validation || { name: 'any', params: {} };
  space.treasuries = space.treasuries || [];

  // always return parent and children in child node format
  // will be overwritten if other fields than id are requested
  space.parent = space.parent ? { id: space.parent } : null;
  space.children = space.children?.map((child: string) => ({ id: child })) || [];

  return space as Space;
}

export function buildWhereQuery(fields: QueryFields, alias: string, where: QueryArgs['where']) {
  let query = '';
  const params: any[] = [];
  Object.entries(fields).forEach(([field, type]) => {
    if (where[field] !== undefined) {
      query += `AND ${alias}.${field} = ? `;
      params.push(where[field]);
    }

    const fieldNot = where[`${field}_not`];
    if (fieldNot !== undefined) {
      query += `AND ${alias}.${field} != ? `;
      params.push(fieldNot);
    }

    const fieldIn = where[`${field}_in`] || [];
    if (fieldIn.length > 0) {
      query += `AND ${alias}.${field} IN (?) `;
      params.push(fieldIn);
    }

    const fieldNotIn = where[`${field}_not_in`] || [];
    if (fieldNotIn.length > 0) {
      query += `AND ${alias}.${field} NOT IN (?) `;
      params.push(fieldNotIn);
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

export async function fetchSpaces(args: QueryArgs): Promise<Space[]> {
  const { first = 20, skip = 0, where = {} } = args;

  const fields: QueryFields = { id: 'string' };
  const whereQuery = buildWhereQuery(fields, 's', where);
  const queryStr = whereQuery.query;
  const params = whereQuery.params;

  let orderBy = args.orderBy || 'created_at';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created_at', 'updated_at', 'id'].includes(orderBy)) orderBy = 'created_at';
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  const query = `
    SELECT s.* FROM spaces s
    WHERE s.deleted = 0 ${queryStr}
    GROUP BY s.id
    ORDER BY s.${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);

  const spaces = await db.queryAsync(query, params);
  return spaces.map(space =>
    Object.assign(space, formatSpace(space.id as string, space.settings as string))
  );
}

function checkRelatedSpacesNesting(requestedFields: any): void {
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

function needsRelatedSpacesData(requestedFields: any): boolean {
  // id's of parent/children are already included in the result from fetchSpaces
  // an additional query is only needed if other fields are requested
  return !(
    !(requestedFields.parent && Object.keys(requestedFields.parent).some(key => key !== 'id')) &&
    !(requestedFields.children && Object.keys(requestedFields.children).some(key => key !== 'id'))
  );
}

function mapRelatedSpacesToSpaces(spaces: Space[], relatedSpaces: Space[]) {
  if (!relatedSpaces.length) return spaces;

  return spaces.map(space => {
    if (space.children) {
      space.children = space.children
        .map(c => relatedSpaces.find(s => s.id === c.id) || c)
        .filter(s => s);
    }
    if (space.parent) {
      space.parent =
        relatedSpaces.find(s => space.parent && s.id === space.parent.id) || space.parent;
    }
    return space;
  });
}

async function fetchRelatedSpaces(spaces: Space[]) {
  // collect all parent and child ids of all spaces
  const relatedSpaceIDs = spaces.reduce((ids: string[], space: Space) => {
    if (space.children) ids.push(...space.children.map(c => c.id));
    if (space.parent) ids.push(space.parent.id);
    return ids;
  }, []);

  return await fetchSpaces({
    where: { id_in: relatedSpaceIDs },
    first: 20,
    skip: 0
  });
}

export async function handleRelatedSpaces(info: any, spaces: Space[]) {
  const requestedFields = info ? graphqlFields(info) : {};
  if (needsRelatedSpacesData(requestedFields)) {
    checkRelatedSpacesNesting(requestedFields);
    const relatedSpaces = await fetchRelatedSpaces(spaces);
    spaces = mapRelatedSpacesToSpaces(spaces, relatedSpaces);
  }
  return spaces;
}

export function formatUser(user: SqlRow) {
  const profile = jsonParse(user.profile as string, {});
  delete user.profile;

  return {
    ...user,
    ...profile
  } as User;
}

export function formatProposal(proposal: SqlRow) {
  const networkStr = network === 'testnet' ? 'demo.' : '';
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > (proposal.start as number)) proposalState = 'active';
  if (ts > (proposal.end as number)) proposalState = 'closed';
  const space = formatSpace(proposal.space as string, proposal.settings as string);

  return {
    ...proposal,
    choices: jsonParse(proposal.choices as string, []),
    validation: jsonParse(proposal.validation as string, { name: 'any', params: {} }) || {
      name: 'any',
      params: {}
    },
    plugins: jsonParse(proposal.plugins as string, {}),
    scores: jsonParse(proposal.scores as string, []),
    scores_by_strategy: jsonParse(proposal.scores_by_strategy as string, []),
    state: proposalState,
    space,
    link: `https://${networkStr}snapshot.org/#/${space.id}/proposal/${proposal.id}`,
    strategies: (jsonParse(proposal.strategies as string, []) as Strategy[]).map(
      (strategy: Strategy) => ({
        ...strategy,
        // By default return proposal network if strategy network is not defined
        network: strategy.network || proposal.network
      })
    ),
    privacy: proposal.privacy || ''
  } as Proposal;
}

export function formatVote(vote: SqlRow) {
  return {
    ...vote,
    choice: jsonParse(vote.choice as string, {}),
    metadata: jsonParse(vote.metadata as string, {}),
    vp_by_strategy: jsonParse(vote.vp_by_strategy as string, []),
    space: formatSpace(vote.space as string, vote.settings as string)
  } as Vote;
}

export function formatFollow(follow: SqlRow) {
  return {
    ...follow,
    space: formatSpace(follow.space as string, follow.settings as string)
  } as Follow;
}

export function formatSubscription(subscription: SqlRow) {
  return {
    ...subscription,
    space: formatSpace(subscription.space as string, subscription.settings as string)
  } as Subscription;
}
