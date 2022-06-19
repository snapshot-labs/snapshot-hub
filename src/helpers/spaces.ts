import snapshot from '@snapshot-labs/snapshot.js';
import { uniq } from 'lodash';
import db from './mysql';

export let spaces = {};
export const spacesMetadata = {};
export const spaceProposals = {};
export const spaceVotes = {};
export const spaceVoters = {};
export const spaceFollowers = {};

async function loadSpaces() {
  console.log('[spaces] Load spaces from db');
  const query = 'SELECT id, settings FROM spaces ORDER BY id ASC';
  const s = await db.queryAsync(query);
  spaces = Object.fromEntries(
    s.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)])
  );
  const totalSpaces = Object.keys(spaces).length;
  console.log('[spaces] Total spaces', totalSpaces);
}

async function getProposals() {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  const query = `
    SELECT space, COUNT(id) AS count,
    COUNT(IF(start < ? AND end > ?, 1, NULL)) AS active,
    COUNT(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) AS count_1d,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM proposals GROUP BY space
  `;
  return await db.queryAsync(query, [ts, ts]);
}

async function getVotes() {
  const query = `
    SELECT space, COUNT(id) as count,
    count(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) as count_1d,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM votes GROUP BY space
  `;
  return await db.queryAsync(query);
}

async function getVoters() {
  const query = `
    SELECT space, COUNT(DISTINCT(voter)) as count,
    count(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) as count_1d,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM votes GROUP BY space
  `;
  return await db.queryAsync(query);
}

async function getFollowers() {
  const query = `
    SELECT space, COUNT(id) as count,
    count(IF(created > (UNIX_TIMESTAMP() - 86400), 1, NULL)) as count_1d,
    count(IF(created > (UNIX_TIMESTAMP() - 604800), 1, NULL)) as count_7d
    FROM follows GROUP BY space
  `;
  return await db.queryAsync(query);
}

async function loadSpacesMetrics() {
  console.log('[spaces] Load spaces metrics');

  const metrics = await Promise.all([
    getProposals(),
    getVotes(),
    getVoters(),
    getFollowers()
  ]);
  metrics[0].forEach(proposals => {
    if (spaces[proposals.space]) spaceProposals[proposals.space] = proposals;
  });
  metrics[1].forEach(votes => {
    if (spaces[votes.space]) spaceVotes[votes.space] = votes;
  });
  metrics[2].forEach(voters => {
    if (spaces[voters.space]) spaceVoters[voters.space] = voters;
  });
  metrics[3].forEach(followers => {
    if (spaces[followers.space]) spaceFollowers[followers.space] = followers;
  });

  Object.entries(spaces).forEach(([id, space]: any) => {
    spacesMetadata[id] = {
      name: space.name,
      private: space.private || undefined,
      terms: space.terms || undefined,
      network: space.network || undefined,
      networks: uniq(
        space.strategies.map(strategy => strategy.network || space.network)
      ),
      categories: space.categories || undefined,
      activeProposals:
        (spaceProposals[id] && spaceProposals[id].active) || undefined,
      proposals: (spaceProposals[id] && spaceProposals[id].count) || undefined,
      proposals_active:
        (spaceProposals[id] && spaceProposals[id].active) || undefined,
      proposals_1d:
        (spaceProposals[id] && spaceProposals[id].count_1d) || undefined,
      proposals_7d:
        (spaceProposals[id] && spaceProposals[id].count_7d) || undefined,
      votes: (spaceVotes[id] && spaceVotes[id].count) || undefined,
      votes_1d: (spaceVotes[id] && spaceVotes[id].count_1d) || undefined,
      votes_7d: (spaceVotes[id] && spaceVotes[id].count_7d) || undefined,
      voters: (spaceVoters[id] && spaceVoters[id].count) || undefined,
      voters_1d: (spaceVoters[id] && spaceVoters[id].count_1d) || undefined,
      voters_7d: (spaceVoters[id] && spaceVoters[id].count_7d) || undefined,
      followers: (spaceFollowers[id] && spaceFollowers[id].count) || undefined,
      followers_1d:
        (spaceFollowers[id] && spaceFollowers[id].count_1d) || undefined,
      followers_7d:
        (spaceFollowers[id] && spaceFollowers[id].count_7d) || undefined
    };
  });
  console.log('[spaces] Space metrics loaded');
}

async function run() {
  await loadSpaces();
  await loadSpacesMetrics();
  await snapshot.utils.sleep(20e3);
  await run();
}

setTimeout(() => run(), 3e3);
