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

  if (params.verified) popularity *= 100000000;
  if (params.turbo) {
    popularity += 1;
    popularity *= 100000000;
  }

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
    const strategyNames = uniq(
      (space.strategies || []).map(strategy => strategy.name)
    );
    const pluginNames = uniq(Object.keys(space.plugins || {}));
    const popularity = getPopularity(id, {
      verified,
      turbo,
      networks,
      strategies: strategyNames
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
      },
      strategyNames,
      pluginNames
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

  const allActivitiesQuery = `
    SELECT
      id,
      proposal_count AS count
    FROM spaces
  `;

  const results = Object.fromEntries(
    (await db.queryAsync(allActivitiesQuery)).map(({ id, count }) => [
      id,
      { count, count_7d: 0, active: 0 }
    ])
  );

  const recentActivityQuery = `
    SELECT
      space,
      count(id) AS count
    FROM proposals
    WHERE created > (UNIX_TIMESTAMP() - 604800)
    GROUP BY space
  `;

  (await db.queryAsync(recentActivityQuery)).forEach(({ space, count }) => {
    if (results[space]) results[space].count_7d = count;
  });

  const activeQuery = `
    SELECT
      space,
      count(id) AS count
    FROM proposals
    WHERE start < ? AND end > ? AND flagged = 0
    GROUP BY space
  `;

  (await db.queryAsync(activeQuery, [ts, ts])).forEach(({ space, count }) => {
    if (results[space]) results[space].active = count;
  });

  return results;
}

async function getVotes() {
  const allActivitiesQuery = `
    SELECT
      id,
      vote_count AS count
    FROM spaces
  `;

  const results = Object.fromEntries(
    (await db.queryAsync(allActivitiesQuery)).map(({ id, count }) => [
      id,
      { count, count_7d: 0 }
    ])
  );

  const recentActivityQuery = `
    SELECT
      space,
      count(id) AS count
    FROM votes
    WHERE created > (UNIX_TIMESTAMP() - 604800)
    GROUP BY space
  `;

  (await db.queryAsync(recentActivityQuery)).forEach(({ space, count }) => {
    if (results[space]) results[space].count_7d = count;
  });

  return results;
}

async function getFollowers() {
  const allActivitiesQuery = `
    SELECT
      id,
      follower_count AS count
    FROM spaces
  `;

  const results = Object.fromEntries(
    (await db.queryAsync(allActivitiesQuery)).map(({ id, count }) => [
      id,
      { count, count_7d: 0 }
    ])
  );

  const recentActivityQuery = `
    SELECT
      space,
      count(id) AS count
    FROM follows
    WHERE created > (UNIX_TIMESTAMP() - 604800)
    GROUP BY space
  `;

  (await db.queryAsync(recentActivityQuery)).forEach(({ space, count }) => {
    if (results[space]) results[space].count_7d = count;
  });

  return results;
}

async function loadSpacesMetrics() {
  const followersMetrics = await getFollowers();
  for (const [space, metrics] of Object.entries(followersMetrics)) {
    if (spaces[space]) spaceFollowers[space] = metrics;
  }
  log.info('[spaces] Followers metrics loaded');
  mapSpaces();

  const proposalsMetrics = await getProposals();
  for (const [space, metrics] of Object.entries(proposalsMetrics)) {
    if (spaces[space]) spaceProposals[space] = metrics;
  }
  log.info('[spaces] Proposals metrics loaded');
  mapSpaces();

  const votesMetrics = await getVotes();
  for (const [space, metrics] of Object.entries(votesMetrics)) {
    if (spaces[space]) spaceVotes[space] = metrics;
  }
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
  await snapshot.utils.sleep(120e3);
  run();
}
