import snapshot from '@snapshot-labs/snapshot.js';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { uniq } from 'lodash';
import db from './mysql';
import log from './log';
import { capture } from '@snapshot-labs/snapshot-sentry';

const RUN_INTERVAL = 120e3;

export let spaces = {};
export let rankedSpaces: Metadata[] = [];
export const spacesMetadata: Record<string, Metadata> = {};

type Metadata = {
  id: string;
  name: string;
  verified: boolean;
  flagged: boolean;
  turbo: boolean;
  hibernated: boolean;
  popularity: number;
  rank: number;
  private: boolean;
  categories: string[];
  networks: string[];
  counts: {
    activeProposals: number;
    proposalsCount: number;
    proposalsCount7d: number;
    followersCount: number;
    followersCount7d: number;
    votesCount: number;
    votesCount7d: number;
  };
  strategyNames: string[];
  pluginNames: string[];
};

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

function getPopularity(space: Metadata): number {
  let popularity =
    space.counts.votesCount / 100 +
    space.counts.votesCount7d +
    space.counts.proposalsCount / 100 +
    space.counts.proposalsCount7d +
    space.counts.followersCount / 50 +
    space.counts.followersCount7d;

  if (space.networks.some(network => testnets.includes(network)))
    popularity = 1;
  if (space.strategyNames.some(strategy => testStrategies.includes(strategy)))
    popularity = 1;

  if (space.verified) popularity *= 100000000;
  if (space.turbo) {
    popularity += 1;
    popularity *= 100000000;
  }

  return popularity;
}

function sortSpaces() {
  Object.entries(spacesMetadata).forEach(([id, space]: any) => {
    spacesMetadata[id].popularity = getPopularity(space);
  });

  rankedSpaces = Object.values(spacesMetadata)
    .filter((space: any) => !space.private && !space.flagged)
    .sort((a: any, b: any) => b.popularity - a.popularity);

  rankedSpaces.forEach((space, i) => {
    spacesMetadata[space.id].rank = i + 1;
  });
}

function mapSpaces() {
  Object.entries(spaces).forEach(([id, space]: any) => {
    const networks = uniq(
      (space.strategies || [])
        .map(strategy => strategy?.network || space.network)
        .concat(space.network)
    );
    const strategyNames = uniq(
      (space.strategies || []).map(strategy => strategy.name)
    );
    const pluginNames = uniq(Object.keys(space.plugins || {}));

    spacesMetadata[id] = {
      id,
      name: space.name,
      verified: space.verified,
      flagged: space.flagged,
      turbo: space.turbo,
      hibernated: space.hibernated,
      popularity: spacesMetadata[id]?.popularity || 0,
      rank: spacesMetadata[id]?.rank || 0,
      private: space.private ?? false,
      categories: space.categories ?? [],
      networks,
      counts: {
        activeProposals: spacesMetadata[id]?.counts?.activeProposals || 0,
        proposalsCount: space.proposal_count || 0,
        proposalsCount7d: spacesMetadata[id]?.counts?.proposalsCount7d || 0,
        followersCount: space.follower_count || 0,
        followersCount7d: spacesMetadata[id]?.counts?.followersCount7d || 0,
        votesCount: space.vote_count || 0,
        votesCount7d: spacesMetadata[id]?.counts?.votesCount7d || 0
      },
      strategyNames,
      pluginNames
    };
  });
}

async function loadSpaces() {
  const query =
    'SELECT id, settings, flagged, verified, turbo, hibernated FROM spaces WHERE deleted = 0 ORDER BY id ASC';
  const s = await db.queryAsync(query);
  spaces = Object.fromEntries(
    s.map(space => [
      space.id,
      {
        ...JSON.parse(space.settings),
        flagged: space.flagged === 1,
        verified: space.verified === 1,
        turbo: space.turbo === 1,
        hibernated: space.hibernated === 1
      }
    ])
  );
  const totalSpaces = Object.keys(spaces).length;
  log.info(`[spaces] total spaces ${totalSpaces}`);
  mapSpaces();
}

async function getProposals(): Promise<
  Record<string, { activeProposals: number; proposalsCount7d: number }>
> {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  const results = {};

  const query = `
    SELECT
      space,
      COUNT(id) AS proposalsCount7d
    FROM proposals
    WHERE created > (UNIX_TIMESTAMP() - 604800)
    GROUP BY space
  `;

  (await db.queryAsync(query)).forEach(({ space, proposalsCount7d }) => {
    results[space] ||= {};
    results[space].proposalsCount7d = proposalsCount7d;
  });

  const activeQuery = `
    SELECT
      space,
      COUNT(id) AS activeProposals
    FROM proposals
    WHERE start < ? AND end > ? AND flagged = 0
    GROUP BY space
  `;

  (await db.queryAsync(activeQuery, [ts, ts])).forEach(
    ({ space, activeProposals }) => {
      results[space] ||= {};
      results[space].activeProposals = activeProposals;
    }
  );

  return results;
}

async function getVotes(): Promise<Record<string, { votesCount7d: number }>> {
  const query = `
    SELECT
      space,
      COUNT(id) AS votesCount7d
    FROM votes
    WHERE created > (UNIX_TIMESTAMP() - 604800)
    GROUP BY space
  `;

  return Object.fromEntries(
    (await db.queryAsync(query)).map(({ space, votesCount7d }) => [
      space,
      { votesCount7d }
    ])
  );
}

async function getFollowers(): Promise<
  Record<string, { followersCount7d: number }>
> {
  const query = `
    SELECT
      space,
      COUNT(id) AS followersCount7d
    FROM follows
    WHERE created > (UNIX_TIMESTAMP() - 604800)
    GROUP BY space
  `;

  return Object.fromEntries(
    (await db.queryAsync(query)).map(({ space, followersCount7d }) => [
      space,
      { followersCount7d }
    ])
  );
}

async function loadSpacesMetrics() {
  [getFollowers, getProposals, getVotes].forEach(async metricFn => {
    const results = await metricFn();

    for (const [space, metrics] of Object.entries(results)) {
      if (!spacesMetadata[space]) continue;

      spacesMetadata[space].counts = {
        ...spacesMetadata[space].counts,
        ...metrics
      };
    }
    log.info(`[spaces] ${metricFn.name.replace('get', '')} metrics loaded`);
  });
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
    sortSpaces();
  } catch (e: any) {
    capture(e);
    log.error(`[spaces] failed to load spaces, ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(RUN_INTERVAL);
  run();
}
