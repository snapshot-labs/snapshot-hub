import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { uniq } from 'lodash';
import log from './log';
import db from './mysql';

const RUN_INTERVAL = 120e3;
const TEST_STRATEGIES = [
  'ticket',
  'api',
  'api-v2',
  'api-post',
  'api-v2-override'
];
const TESTNET_NETWORKS = (
  Object.values(networks) as { testnet?: boolean; key: string }[]
)
  .filter(network => network.testnet)
  .map(network => network.key);

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
  rank: number | null;
  private: boolean;
  categories: string[];
  networks: string[];
  counts: {
    activeProposals: number;
    proposalsCount: number;
    proposalsCount1d: number;
    proposalsCount7d: number;
    proposalsCount30d: number;
    followersCount: number;
    followersCount7d: number;
    votesCount: number;
    votesCount7d: number;
  };
  strategyNames: string[];
  pluginNames: string[];
};

function getPopularity(space: Metadata): number {
  let popularity =
    space.counts.votesCount / 100 +
    space.counts.votesCount7d +
    space.counts.proposalsCount / 100 +
    space.counts.proposalsCount7d +
    space.counts.followersCount / 50 +
    space.counts.followersCount7d;

  if (
    space.networks.some(network => TESTNET_NETWORKS.includes(network)) ||
    space.strategyNames.some(strategy => TEST_STRATEGIES.includes(strategy))
  )
    popularity = 1;

  if (space.verified) popularity *= 100000000;
  if (space.turbo) {
    popularity += 1;
    popularity *= 100000000;
  }

  return popularity;
}

function sortSpaces() {
  Object.entries(spacesMetadata).forEach(([id, space]) => {
    spacesMetadata[id].popularity = getPopularity(space);
  });

  rankedSpaces = Object.values(spacesMetadata)
    .filter(space => !space.private && !space.flagged)
    .sort((a, b) => b.popularity - a.popularity)
    .map((space, i) => {
      spacesMetadata[space.id].rank = i + 1;
      space.rank = i + 1;
      return space;
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
      rank: spacesMetadata[id]?.rank || null,
      private: space.private ?? false,
      categories: space.categories ?? [],
      networks,
      counts: {
        activeProposals: spacesMetadata[id]?.counts?.activeProposals || 0,
        proposalsCount: space.proposal_count || 0,
        proposalsCount1d: spacesMetadata[id]?.counts?.proposalsCount1d || 0,
        proposalsCount7d: spacesMetadata[id]?.counts?.proposalsCount7d || 0,
        proposalsCount30d: spacesMetadata[id]?.counts?.proposalsCount30d || 0,
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
  const startTime = +Date.now();

  const query = `
      SELECT id, settings, flagged, verified, turbo, hibernated, follower_count, proposal_count, vote_count
      FROM spaces
      WHERE deleted = 0
      ORDER BY id ASC
    `;
  const results = await db.queryAsync(query);

  spaces = Object.fromEntries(
    results.map(space => [
      space.id,
      {
        ...JSON.parse(space.settings),
        flagged: space.flagged === 1,
        verified: space.verified === 1,
        turbo: space.turbo === 1,
        hibernated: space.hibernated === 1,
        follower_count: space.follower_count,
        vote_count: space.vote_count,
        proposal_count: space.proposal_count
      }
    ])
  );

  log.info(
    `[spaces] total spaces ${Object.keys(spaces).length}, in (${(
      (+Date.now() - startTime) /
      1000
    ).toFixed()}s)`
  );
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
      COUNT(CASE WHEN created > (UNIX_TIMESTAMP() - 86400) THEN 1 END) AS proposalsCount1d,
      COUNT(CASE WHEN created > (UNIX_TIMESTAMP() - 604800) THEN 1 END) AS proposalsCount7d,
      COUNT(id) AS proposalsCount30d
    FROM proposals
    WHERE created > (UNIX_TIMESTAMP() - 2592000)
    GROUP BY space
  `;

  (await db.queryAsync(query)).forEach(
    ({ space, proposalsCount1d, proposalsCount7d, proposalsCount30d }) => {
      results[space] ||= {};
      results[space].proposalsCount1d = proposalsCount1d;
      results[space].proposalsCount7d = proposalsCount7d;
      results[space].proposalsCount30d = proposalsCount30d;
    }
  );

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
  const metricsFn = [getFollowers, getProposals, getVotes];
  const results = await Promise.all(metricsFn.map(fn => fn()));

  metricsFn.forEach((metricFn, i) => {
    for (const [space, metrics] of Object.entries(results[i])) {
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
    SELECT settings, domain, flagged, verified, turbo, hibernated, deleted, follower_count, proposal_count, vote_count
    FROM spaces
    WHERE id = ?
    LIMIT 1`;

  const [space] = await db.queryAsync(query, [id]);

  if (!space) return Promise.reject(new Error('NOT_FOUND'));

  return {
    ...JSON.parse(space.settings),
    domain: space.domain,
    flagged: space.flagged === 1,
    verified: space.verified === 1,
    turbo: space.turbo === 1,
    hibernated: space.hibernated === 1,
    deleted: space.deleted === 1
  };
}

export default async function run() {
  try {
    log.info('[spaces] Start spaces refresh');
    await loadSpaces();
    await loadSpacesMetrics();
    sortSpaces();
    log.info('[spaces] End spaces refresh');
  } catch (e: any) {
    capture(e);
    log.error(`[spaces] failed to load spaces, ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(RUN_INTERVAL);
  run();
}
