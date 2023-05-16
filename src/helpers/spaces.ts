import snapshot from '@snapshot-labs/snapshot.js';
import { uniq } from 'lodash';
import db from './mysql';
import log from './log';
import { flaggedSpaces, verifiedSpaces } from './moderation';

export let spaces = {};
export const exploreEndpointData = {};
export const spacesMetadata = {};
export let rankedSpaces: any = [];
const spaceProposals = {};
const spaceVotes = {};
const spaceFollowers = {};

function getPopularity(id: string, verified: boolean): number {
  let popularity =
    (spaceVotes[id]?.count || 0) / 50 +
    (spaceVotes[id]?.count_7d || 0) +
    (spaceProposals[id]?.count_7d || 0) * 50 +
    (spaceFollowers[id]?.count_7d || 0);

  if (verified) {
    popularity *= 5;
    popularity += 100;
  }

  return popularity;
}

function mapSpaces() {
  Object.entries(spaces).forEach(([id, space]: any) => {
    // exploreEndpointData will be deprecated in the future
    exploreEndpointData[id] = {
      name: space.name,
      private: space.private || undefined,
      terms: space.terms || undefined,
      network: space.network || undefined,
      networks: uniq((space.strategies || []).map(strategy => strategy.network || space.network)),
      categories: space.categories || undefined,
      activeProposals: (spaceProposals[id] && spaceProposals[id].active) || undefined,
      proposals: (spaceProposals[id] && spaceProposals[id].count) || undefined,
      proposals_active: (spaceProposals[id] && spaceProposals[id].active) || undefined,
      proposals_7d: (spaceProposals[id] && spaceProposals[id].count_7d) || undefined,
      votes: (spaceVotes[id] && spaceVotes[id].count) || undefined,
      votes_7d: (spaceVotes[id] && spaceVotes[id].count_7d) || undefined,
      followers: (spaceFollowers[id] && spaceFollowers[id].count) || undefined,
      followers_7d: (spaceFollowers[id] && spaceFollowers[id].count_7d) || undefined
    };
    // exploreEndpointData will be deprecated in the future

    const verified = verifiedSpaces?.includes(id) || false;
    const flagged = flaggedSpaces?.includes(id) || false;
    const popularity = getPopularity(id, verified);

    spacesMetadata[id] = {
      id,
      name: space.name,
      verified,
      flagged,
      popularity,
      private: space.private ?? false,
      categories: space.categories ?? [],
      networks: uniq(
        (space.strategies || [])
          .map(strategy => strategy?.network || space.network)
          .concat(space.network)
      ),
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
    .sort((a: any, b: any) => b.popularity - a.popularity)
    .filter((space: any) => !space.private);

  rankedSpaces.forEach((space: any, i: number) => {
    spacesMetadata[space.id].rank = i + 1;
  });
}

async function loadSpaces() {
  const query = 'SELECT id, settings FROM spaces WHERE deleted = 0 ORDER BY id ASC';
  const s = await db.queryAsync(query);
  spaces = Object.fromEntries(s.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)]));
  const totalSpaces = Object.keys(spaces).length;
  log.info(`[spaces] total spaces ${totalSpaces}`);
  mapSpaces();
}

async function getProposals() {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  const query = `
    SELECT space, COUNT(id) AS count,
    COUNT(IF(start < ? AND end > ?, 1, NULL)) AS active,
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

async function run() {
  try {
    await loadSpaces();
    await loadSpacesMetrics();
  } catch (e) {
    log.error(`[spaces] failed to load spaces, ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(360e3);
  run();
}

run();
