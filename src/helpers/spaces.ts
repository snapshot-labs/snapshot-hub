import snapshot from '@snapshot-labs/snapshot.js';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { uniq } from 'lodash';
import db from './mysql';
import log from './log';
import { capture } from '@snapshot-labs/snapshot-sentry';

export let spaces = {};
export const spacesMetadata = {};
export let rankedSpaces: any = [];
const spaceProposals = {};
const spaceVotes = {};
const spaceFollowers = {};

const testnets = Object.values(networks)
  .filter((network: any) => network.testnet)
  .map((network: any) => network.key);
const testStrategies = [
  'ticket',
  'api',
  'api-v2',
  'api-post',
  'api-v2-override'
];

function getPopularity(
  id: string,
  params: {
    verified: boolean;
    turbo: boolean;
    networks: string[];
    strategies: any[];
  }
): number {
  let popularity =
    (spaceVotes[id]?.count || 0) / 100 +
    (spaceVotes[id]?.count_7d || 0) +
    (spaceProposals[id]?.count || 0) / 100 +
    (spaceProposals[id]?.count_7d || 0) +
    (spaceFollowers[id]?.count || 0) / 50 +
    (spaceFollowers[id]?.count_7d || 0);

  if (params.networks.some(network => testnets.includes(network)))
    popularity = 1;
  if (params.strategies.some(strategy => testStrategies.includes(strategy)))
    popularity = 1;

  if (params.verified) popularity *= 100000;
  if (params.turbo) popularity *= 100000;

  return popularity;
}

function mapSpaces() {
  Object.entries(spaces).forEach(([id, space]: any) => {
    const verified = space.verified || false;
    const flagged = space.flagged || false;
    const turbo = space.turbo || false;
    const hibernated = space.hibernated || false;
    const networks = uniq(
      (space.strategies || [])
        .map(strategy => strategy?.network || space.network)
        .concat(space.network)
    );
    const strategies = uniq(
      space.strategies?.map(strategy => strategy.name) || []
    );
    const popularity = getPopularity(id, {
      verified,
      turbo,
      networks,
      strategies
    });

    spacesMetadata[id] = {
      id,
      name: space.name,
      verified,
      flagged,
      turbo,
      hibernated,
      popularity,
      private: space.private ?? false,
      categories: space.categories ?? [],
      networks,
      counts: {
        activeProposals: spaceProposals[id]?.active || 0,
        proposalsCount: spaceProposals[id]?.count || 0,
        proposalsCount7d: spaceProposals[id]?.count_7d || 0,
        followersCount: spaceFollowers[id]?.count || 0,
        followersCount7d: spaceFollowers[id]?.count_7d || 0,
        votesCount: spaceVotes[id]?.count || 0,
        votesCount7d: spaceVotes[id]?.count_7d || 0
      }
    };
  });

  rankedSpaces = Object.values(spacesMetadata)
    .filter((space: any) => !space.private && !space.flagged)
    .sort((a: any, b: any) => b.popularity - a.popularity);

  rankedSpaces.forEach((space: any, i: number) => {
    spacesMetadata[space.id].rank = i + 1;
  });
}

async function loadSpaces() {
  const query =
    'SELECT id, settings, flagged, verified, turbo, hibernated FROM spaces WHERE deleted = 0 ORDER BY id ASC';
  const s = await db.queryAsync(query);
  spaces = Object.fromEntries(
    s.map(ensSpace => [
      ensSpace.id,
      {
        ...JSON.parse(ensSpace.settings),
        flagged: ensSpace.flagged === 1,
        verified: ensSpace.verified === 1,
        turbo: ensSpace.turbo === 1,
        hibernated: ensSpace.hibernated === 1
      }
    ])
  );
  const totalSpaces = Object.keys(spaces).length;
  log.info(`[spaces] total spaces ${totalSpaces}`);
  mapSpaces();
}

async function getProposals() {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  const query = `
    SELECT space, COUNT(id) AS count,
    COUNT(IF(start < ? AND end > ? AND flagged = 0, 1, NULL)) AS active,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM proposals GROUP BY space
  `;
  return await db.queryAsync(query, [ts, ts]);
}

async function getVotes() {
  const query = `
    SELECT space, COUNT(id) as count,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM votes GROUP BY space
  `;
  return await db.queryAsync(query);
}

export async function getCombinedMembersAndVoters(spaceId: string, cursor: string | null, pageSize: number, knownAdmins: string[] = [], knownModerators: string[] = [], knownMembers: string[] = []) {
  const params: (string | number)[] = [];
  let subqueries: string[] = [];

  // Excluding known addresses fetched during the Space verification
  const exclusionList = [...knownAdmins, ...knownModerators, ...knownMembers];
  let placeholders = exclusionList.map(() => '?').join(', ');

  // Other roles are already known and fetched at the app level while Space Verification
  subqueries.push(`
    SELECT DISTINCT voter AS address
    FROM votes
    WHERE space_id = ? AND voter NOT IN (${placeholders})
  `);
  params.push(spaceId, ...exclusionList);

  const cursorClause = cursor ? ' AND address > ?' : '';
  const query = `
    SELECT address
    FROM (${subqueries.join(' UNION ')})
    WHERE 1=1 ${cursorClause}
    ORDER BY address
    LIMIT ?
  `;

  if (cursor) {
    params.push(cursor);
  }
  params.push(pageSize);  

  const results = await db.queryAsync(query, params);
  if (!results || results.length === 0) {
    return Promise.reject(new Error('NOT_FOUND'));
  }

  const nextCursor = results.length === pageSize ? results[results.length - 1].address : null;
  return {
    members: results.map(row => row.address),
    nextCursor: nextCursor
  };
}




async function getFollowers() {
  const query = `
    SELECT space, COUNT(id) as count,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM follows GROUP BY space
  `;
  return await db.queryAsync(query);
}

async function loadSpacesMetrics() {
  const followersMetrics = await getFollowers();
  followersMetrics.forEach(followers => {
    if (spaces[followers.space]) spaceFollowers[followers.space] = followers;
  });
  log.info('[spaces] Followers metrics loaded');
  mapSpaces();

  const proposalsMetrics = await getProposals();
  proposalsMetrics.forEach(proposals => {
    if (spaces[proposals.space]) spaceProposals[proposals.space] = proposals;
  });
  log.info('[spaces] Proposals metrics loaded');
  mapSpaces();

  const votesMetrics = await getVotes();
  votesMetrics.forEach(votes => {
    if (spaces[votes.space]) spaceVotes[votes.space] = votes;
  });
  log.info('[spaces] Votes metrics loaded');
  mapSpaces();
}

export async function getSpace(id: string) {
  const query = `
    SELECT settings, flagged, verified, turbo, hibernated, deleted
    FROM spaces
    WHERE id = ?
    LIMIT 1`;

  const [space] = await db.queryAsync(query, [id]);

  if (!space) return Promise.reject(new Error('NOT_FOUND'));

  return {
    ...JSON.parse(space.settings),
    flagged: space.flagged === 1,
    verified: space.verified === 1,
    turbo: space.turbo === 1,
    hibernated: space.hibernated === 1,
    deleted: space.deleted === 1
  };
}

export default async function run() {
  try {
    await loadSpaces();
    await loadSpacesMetrics();
  } catch (e: any) {
    capture(e);
    log.error(`[spaces] failed to load spaces, ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(360e3);
  run();
}
