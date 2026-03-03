import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { uniq } from 'lodash';
import log from './log';
import db from './mysql';

const RUN_INTERVAL = 120e3;
const BATCH_SIZE = 40000;

export let rankedSpaces: Metadata[] = [];

export let networkSpaceCounts: Record<string, number> = {};

export let spacesMetadata: Record<string, Metadata> = {};

type Metadata = {
  id: string;
  name: string;
  verified: boolean;
  flagged: boolean;
  turbo: boolean;
  turboExpiration: number;
  hibernated: boolean;
  parent: string;
  popularity: number;
  rank: number | null;
  private: boolean;
  skin: string | null;
  validationName: string | null;
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

function isTurbo(turbo: boolean, turboExpiration: number): boolean {
  return turbo || turboExpiration > Date.now() / 1e3;
}

function getPopularity(space: Metadata): number {
  let popularity =
    space.counts.proposalsCount / 20 +
    space.counts.proposalsCount7d +
    space.counts.votesCount / 40 +
    space.counts.votesCount7d +
    space.counts.followersCount / 80 +
    space.counts.followersCount7d;

  const isVerified = space.verified;
  const isTurbo = space.turbo && !space.parent;
  const hasActiveProposals = space.counts.activeProposals > 0;

  if (isTurbo && hasActiveProposals) {
    popularity += 5e10;
  } else if (isVerified && hasActiveProposals) {
    popularity += 4e10;
  } else if (isTurbo) {
    popularity += 3e10;
  } else if (isVerified) {
    popularity += 2e10;
  } else if (hasActiveProposals) {
    popularity += 1e10;
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

function mapSpaces(spaces: Record<string, any>) {
  spacesMetadata = {};
  networkSpaceCounts = {};

  Object.entries(spaces).forEach(([id, space]: any) => {
    const networks = uniq(
      [
        space.network,
        ...space.strategies.map((strategy: any) => strategy.network),
        ...space.strategies.flatMap((strategy: any) =>
          Array.isArray(strategy.params?.strategies)
            ? strategy.params.strategies.map((param: any) => param.network)
            : []
        )
      ].filter(Boolean)
    );

    networks.forEach(network => {
      networkSpaceCounts[network] = (networkSpaceCounts[network] || 0) + 1;
    });

    const strategyNames = uniq(
      (space.strategies || []).map(strategy => strategy.name)
    );
    const pluginNames = uniq(Object.keys(space.plugins || {}));

    spacesMetadata[id] = {
      id,
      name: space.name,
      verified: space.verified,
      flagged: space.flagged,
      turbo: isTurbo(space.turbo, space.turboExpiration),
      turboExpiration: space.turboExpiration,
      hibernated: space.hibernated,
      parent: space.parent,
      popularity: spacesMetadata[id]?.popularity || 0,
      rank: spacesMetadata[id]?.rank || null,
      private: space.private ?? false,
      categories: space.categories ?? [],
      skin: space.skin || null,
      validationName: space.validation?.name || null,
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
  let offset = 0;
  let allResults: any[] = [];
  let hasMore = true;
  let batchCount = 0;

  while (hasMore) {
    const query = `
        SELECT id, settings, flagged, verified, turbo, turbo_expiration, hibernated, follower_count, proposal_count, vote_count
        FROM spaces
        WHERE deleted = 0
        ORDER BY id ASC
        LIMIT ?, ?
      `;

    const results = await db.queryAsync(query, [offset, BATCH_SIZE]);
    batchCount++;

    allResults = allResults.concat(results);
    offset += BATCH_SIZE;

    log.info(
      `[spaces] loaded batch ${batchCount}: ${results.length} spaces (total: ${allResults.length})`
    );

    if (results.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  const spaces = Object.fromEntries(
    allResults.map(space => [
      space.id,
      {
        ...JSON.parse(space.settings),
        flagged: space.flagged > 0,
        flagCode: space.flagged,
        verified: space.verified === 1,
        turbo: isTurbo(!!space.turbo, space.turbo_expiration),
        turboExpiration: space.turbo_expiration,
        hibernated: space.hibernated === 1,
        follower_count: space.follower_count,
        vote_count: space.vote_count,
        proposal_count: space.proposal_count
      }
    ])
  );

  log.info(
    `[spaces] total spaces ${
      Object.keys(spaces).length
    }, in ${batchCount} batches (${(
      (+Date.now() - startTime) /
      1000
    ).toFixed()}s)`
  );
  mapSpaces(spaces);
}

async function getProposals(): Promise<
  Record<
    string,
    {
      activeProposals: number;
      proposalsCount1d: number;
      proposalsCount7d: number;
      proposalsCount30d: number;
    }
  >
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

export async function getCombinedMembersAndVoters(
  spaceId: string,
  cursor: string | null,
  pageSize: number,
  knownAdmins: string[] = [],
  knownModerators: string[] = [],
  knownMembers: string[] = []
) {
  const params: (string | number)[] = [spaceId];
  const exclusionList = [...knownAdmins, ...knownModerators, ...knownMembers];

  let query = 'SELECT DISTINCT voter AS address FROM votes WHERE space = ?';
  
  // Add exclusion clause only if there are items to exclude
  if (exclusionList.length > 0) {
    query += ` AND voter NOT IN (${exclusionList.map(() => '?').join(',')})`;
    params.push(...exclusionList);
  }

  if (cursor) {
    query += ' AND voter > ?';
    params.push(cursor);
  }

  query += ' ORDER BY voter LIMIT ?';
  params.push(pageSize);

  const results = await db.queryAsync(query, params);
  if (!results || results.length === 0) {
    return Promise.reject(new Error('NOT_FOUND'));
  }

  const nextCursor =
    results.length === pageSize ? results[results.length - 1].address : null;
    
  return {
    members: results.map(row => row.address),
    nextCursor: nextCursor
  };
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
  const results = await Promise.all([
    getFollowers(),
    getProposals(),
    getVotes()
  ]);

  const [followerMetrics, proposalMetrics, voteMetrics] = results;
  Object.keys(spacesMetadata).forEach(space => {
    spacesMetadata[space].counts = {
      ...spacesMetadata[space].counts,
      activeProposals: proposalMetrics[space]?.activeProposals || 0,
      proposalsCount1d: proposalMetrics[space]?.proposalsCount1d || 0,
      proposalsCount7d: proposalMetrics[space]?.proposalsCount7d || 0,
      proposalsCount30d: proposalMetrics[space]?.proposalsCount30d || 0,
      followersCount7d: followerMetrics[space]?.followersCount7d || 0,
      votesCount7d: voteMetrics[space]?.votesCount7d || 0
    };
  });
}

export async function getSpace(id: string) {
  const query = `
    SELECT settings, domain, flagged, verified, turbo, turbo_expiration, hibernated, deleted, follower_count, proposal_count, vote_count
    FROM spaces
    WHERE id = ?
    LIMIT 1`;

  const [space] = await db.queryAsync(query, [id]);

  if (!space) return Promise.reject(new Error('NOT_FOUND'));

  return {
    ...JSON.parse(space.settings),
    domain: space.domain,
    flagged: space.flagged > 0,
    verified: space.verified === 1,
    turbo: isTurbo(!!space.turbo, space.turbo_expiration),
    turboExpiration: space.turbo_expiration,
    hibernated: space.hibernated === 1,
    deleted: space.deleted === 1
  };
}

export default async function run() {
  while (true) {
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
  }
}
