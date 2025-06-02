import snapshot from '@snapshot-labs/snapshot.js';
import graphqlFields from 'graphql-fields';
import castArray from 'lodash/castArray';
import intersection from 'lodash/intersection';
import uniq from 'lodash/uniq';
import fetch from 'node-fetch';
import db from '../helpers/mysql';
import { spacesMetadata } from '../helpers/spaces';
import { jsonParse } from '../helpers/utils';

const network = process.env.NETWORK || 'testnet';
const domain = `${network === 'testnet' ? 'testnet.' : ''}snapshot.box`;

type AddressFormat = 'evmAddress' | 'starknetAddress';
const DEFAULT_ADDRESS_FORMAT: AddressFormat[] = [
  'evmAddress',
  'starknetAddress'
];

export class PublicError extends Error {}

const ARG_LIMITS = {
  default: {
    first: 1000,
    skip: 5000
  },
  proposals: {
    space_in: 10000
  },
  spaces: {
    first: 1000,
    skip: 100000
  },
  ranking: {
    first: 20,
    skip: 100000
  }
};

const SKIN_SETTINGS = [
  'bg_color',
  'link_color',
  'text_color',
  'content_color',
  'border_color',
  'heading_color',
  'header_color',
  'primary_color',
  'theme',
  'logo'
];

export function checkLimits(args: any = {}, type) {
  const { where = {} } = args;
  const typeLimits = { ...ARG_LIMITS.default, ...(ARG_LIMITS[type] || {}) };

  for (const key in typeLimits) {
    const limit = typeLimits[key];
    const firstLimitReached = key === 'first' && args[key] > limit;
    const skipLimitReached = key === 'skip' && args[key] > limit;
    const whereLimitReached = key.endsWith('_in')
      ? where[key]?.length > limit
      : where[key] > limit;
    if (firstLimitReached || skipLimitReached || whereLimitReached)
      throw new PublicError(
        `The \`${key}\` argument must not be greater than ${limit}`
      );

    if (['first', 'skip'].includes(key) && args[key] < 0) {
      throw new PublicError(`The \`${key}\` argument must be positive`);
    }
  }

  return true;
}

function formatSkinSettings(result) {
  return SKIN_SETTINGS.reduce((acc, colorName) => {
    acc[colorName] = result[colorName];

    return acc;
  }, {});
}

export function formatSpace({
  id,
  settings,
  domain,
  verified,
  turbo,
  turboExpiration,
  flagged,
  hibernated,
  skinSettings
}) {
  const spaceMetadata = spacesMetadata[id] || {};
  const space = { ...jsonParse(settings, {}), ...spaceMetadata.counts };

  space.id = id;
  space.domain = domain || '';
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
  space.voting.quorumType = space.voting.quorumType || 'default';
  space.voting.blind = space.voting.blind || false;
  space.voting.privacy = space.voting.privacy || '';
  space.voting.aliased = space.voting.aliased || false;
  space.voting.hideAbstain = space.voting.hideAbstain || false;
  space.voteValidation = space.voteValidation || { name: 'any', params: {} };
  space.delegationPortal = space.delegationPortal
    ? { delegationNetwork: '1', ...space.delegationPortal }
    : null;
  space.boost = space.boost || { enabled: true, bribeEnabled: false };
  space.strategies = space.strategies?.map(strategy => ({
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
  space.labels = space.labels || [];
  space.skinSettings = skinSettings;

  space.verified = verified ?? null;
  space.flagged = flagged > 0;
  space.flagCode = flagged;
  space.hibernated = hibernated ?? null;
  space.turbo =
    new Date((turboExpiration || 0) * 1000) > new Date() ? true : turbo ?? null;
  space.turboExpiration = turboExpiration ?? 0;
  space.rank = spaceMetadata?.rank ?? null;

  // always return parent and children in child node format
  // will be overwritten if other fields than id are requested
  space.parent = space.parent ? { id: space.parent } : null;
  space.children = space.children?.map(child => ({ id: child })) || [];

  return space;
}

export function formatAddresses(
  addresses: string[],
  types: AddressFormat[] = DEFAULT_ADDRESS_FORMAT
): string[] {
  return addresses
    .map(address => {
      if (
        types.includes('evmAddress') &&
        snapshot.utils.isEvmAddress(address)
      ) {
        return snapshot.utils.getFormattedAddress(address, 'evm');
      }

      if (
        types.includes('starknetAddress') &&
        snapshot.utils.isStarknetAddress(address)
      ) {
        return snapshot.utils.getFormattedAddress(address, 'starknet');
      }

      throw new PublicError('Invalid address');
    })
    .filter(Boolean) as string[];
}

export function buildWhereQuery(
  fields: Record<string, string | string[]>,
  alias: string,
  where
) {
  let query: any = '';
  const params: any[] = [];

  Object.entries(fields).forEach(([field, type]) => {
    const arrayType = castArray(type);

    if (intersection(DEFAULT_ADDRESS_FORMAT, arrayType).length > 0) {
      const conditions = ['', '_not', '_in', '_not_in'];

      conditions.forEach(condition => {
        const key = `${field}${condition}`;

        if (!where[key]) return;

        try {
          const formattedAddresses = uniq(
            formatAddresses(castArray(where[key]), arrayType)
          );

          where[key] = Array.isArray(where[key])
            ? formattedAddresses
            : formattedAddresses[0];
        } catch (e: any) {
          throw new PublicError(`Invalid addresses in ${field}`);
        }
      });
    }
    if (where[field] !== undefined && !Array.isArray(where[field])) {
      query += `AND ${alias}.${field} = ? `;
      params.push(where[field]);
    }

    const fieldNot = where[`${field}_not`];
    if (fieldNot !== undefined) {
      query += `AND ${alias}.${field} != ? `;
      params.push(fieldNot);
    }

    const fieldIn = where[`${field}_in`];
    if (Array.isArray(fieldIn)) {
      if (fieldIn.length > 0) {
        query += `AND ${alias}.${field} IN (?) `;
        params.push(fieldIn);
      } else {
        query += 'AND 1=0 ';
      }
    }

    const fieldNotIn = where[`${field}_not_in`];
    if (Array.isArray(fieldNotIn)) {
      if (fieldNotIn.length > 0) {
        query += `AND ${alias}.${field} NOT IN (?) `;
        params.push(fieldNotIn);
      } else {
        query += 'AND 1=0 ';
      }
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
  const { first = 20, skip = 0, where = {} } = args;

  const fields = { id: 'string', created: 'number', verified: 'boolean' };

  if ('controller' in where) {
    if (!where.controller) return [];

    where.id_in = await getControllerDomains(where.controller);

    delete where.controller;
  }

  const whereQuery = buildWhereQuery(fields, 's', where);
  let queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  let orderBy = args.orderBy || 'created';
  let orderDirection = args.orderDirection || 'desc';
  if (!['created', 'updated', 'id'].includes(orderBy)) orderBy = 'created';
  orderDirection = orderDirection.toUpperCase();
  if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

  if (where.strategy) {
    queryStr += ` AND JSON_CONTAINS(JSON_EXTRACT(s.settings, '$.strategies[*].name'), JSON_ARRAY(?))`;
    params.push(where.strategy);
  }

  if (where.plugin) {
    queryStr += ` AND JSON_CONTAINS(JSON_KEYS(s.settings->'$.plugins'), JSON_ARRAY(?))`;
    params.push(where.plugin);
  }

  if (where.domain) {
    queryStr += ` AND domain = ?`;
    params.push(where.domain);
  }

  if (where.search) {
    const wildcardSearch = `%${where.search}%`;
    queryStr += ` AND (s.id LIKE ? OR s.name LIKE ?)`;
    params.push(wildcardSearch, wildcardSearch);
  }

  const query = `
    SELECT s.*, skins.*, s.id AS id FROM spaces s
    LEFT JOIN skins ON s.id = skins.id
    WHERE s.deleted = 0 ${queryStr}
    ORDER BY s.${orderBy} ${orderDirection} LIMIT ?, ?
  `;
  params.push(skip, first);

  const spaces = await db.queryAsync(query, params);
  return spaces.map(space =>
    Object.assign(
      space,
      formatSpace({
        skinSettings: formatSkinSettings(space),
        turboExpiration: space.turbo_expiration,
        ...space
      })
    )
  );
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
  return !(
    !(
      requestedFields.parent &&
      Object.keys(requestedFields.parent).some(key => key !== 'id')
    ) &&
    !(
      requestedFields.children &&
      Object.keys(requestedFields.children).some(key => key !== 'id')
    )
  );
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
      space.parent =
        relatedSpaces.find(s => s.id === space.parent.id) || space.parent;
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

  return fetchSpaces({
    first: relatedSpaceIDs.length,
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
  proposal.labels = jsonParse(proposal.labels, []) || [];
  proposal.strategies = jsonParse(proposal.strategies, []);
  proposal.validation = jsonParse(proposal.validation, {
    name: 'any',
    params: {}
  });
  if (!proposal.validation || Object.keys(proposal.validation).length === 0) {
    proposal.validation = {
      name: 'any',
      params: {}
    };
  }
  proposal.plugins = jsonParse(proposal.plugins, {});
  proposal.scores = jsonParse(proposal.scores, []);
  proposal.scores_by_strategy = jsonParse(proposal.scores_by_strategy, []);
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  proposal.space = formatSpace({
    id: proposal.space,
    settings: proposal.settings,
    domain: proposal.spaceDomain,
    verified: proposal.spaceVerified,
    turbo: proposal.spaceTurbo,
    turboExpiration: proposal.spaceTurboExpiration,
    flagged: proposal.spaceFlagged,
    hibernated: proposal.spaceHibernated,
    skinSettings: formatSkinSettings(proposal)
  });
  const networkPrefix = network === 'testnet' ? 's-tn' : 's';
  proposal.link = `https://${domain}/#/${networkPrefix}:${proposal.space.id}/proposal/${proposal.id}`;
  proposal.strategies = proposal.strategies.map(strategy => ({
    ...strategy,
    // By default return proposal network if strategy network is not defined
    network: strategy.network || proposal.network
  }));
  proposal.privacy = proposal.privacy || '';
  proposal.quorumType = proposal.quorum_type || 'default';
  const rawFlagged = proposal.flagged;
  proposal.flagCode = rawFlagged;
  proposal.flagged = rawFlagged > 0;
  return proposal;
}

export function formatVote(vote) {
  vote.choice = jsonParse(vote.choice);
  vote.metadata = jsonParse(vote.metadata, {});
  vote.vp_by_strategy = jsonParse(vote.vp_by_strategy, []);
  vote.space = formatSpace({
    id: vote.space,
    domain: vote.spaceDomain,
    settings: vote.settings,
    verified: vote.spaceVerified,
    turbo: vote.spaceTurbo,
    turboExpiration: vote.spaceTurboExpiration,
    flagged: vote.spaceFlagged,
    hibernated: vote.spaceHibernated,
    skinSettings: formatSkinSettings(vote)
  });
  return vote;
}

export function formatFollow(follow) {
  follow.space = formatSpace({
    id: follow.space,
    settings: follow.settings,
    domain: follow.spaceDomain,
    verified: follow.spaceVerified,
    turbo: follow.spaceTurbo,
    turboExpiration: follow.spaceTurboExpiration,
    flagged: follow.spaceFlagged,
    hibernated: follow.spaceHibernated,
    skinSettings: formatSkinSettings(follow)
  });
  return follow;
}

export function formatSubscription(subscription) {
  subscription.space = formatSpace({
    id: subscription.space,
    settings: subscription.settings,
    domain: subscription.spaceDomain,
    verified: subscription.spaceVerified,
    turbo: subscription.spaceTurbo,
    turboExpiration: subscription.spaceTurboExpiration,
    flagged: subscription.spaceFlagged,
    hibernated: subscription.spaceHibernated,
    skinSettings: formatSkinSettings(subscription)
  });
  return subscription;
}

async function getControllerDomains(address: string): Promise<string[]> {
  type JsonRpcResponse = {
    result: string[];
    error?: {
      code: number;
      message: string;
      data: any;
    };
  };

  try {
    const response = await fetch(process.env.STAMP_URL ?? 'https://stamp.fyi', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'lookup_domains',
        params: address,
        network: network === 'testnet' ? ['11155111', '157'] : ['1', '109']
      })
    });
    const { result, error } = (await response.json()) as JsonRpcResponse;

    if (error) throw new PublicError("Failed to resolve controller's domains");

    return result;
  } catch (e) {
    throw new PublicError("Failed to resolve controller's domains");
  }
}
