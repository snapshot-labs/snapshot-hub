import { getProposals, getFollowers, getOneDayVoters } from './adapters/mysql';
import db from './mysql';

export let spaces = {};
export const spacesMetadata = {};
export const spaceProposals = {};
export const spaceFollowers = {};
export const spaceOneDayVoters = {};

async function loadSpacesMetrics() {
  console.log('[spaces] Load spaces metrics');
  Promise.all([getProposals(), getFollowers(), getOneDayVoters()]).then(
    metrics => {
      metrics[0].forEach(proposals => {
        if (spaces[proposals.space])
          spaceProposals[proposals.space] = proposals;
      });
      metrics[1].forEach(followers => {
        if (spaces[followers.space])
          spaceFollowers[followers.space] = followers;
      });
      metrics[2].forEach(votes => {
        if (spaces[votes.space]) spaceOneDayVoters[votes.space] = votes.count;
      });

      Object.entries(spaces).forEach(([id, space]: any) => {
        spacesMetadata[id] = {
          name: space.name,
          avatar: space.avatar || undefined,
          private: space.private || undefined,
          terms: space.terms || undefined,
          network: space.network || undefined,
          categories: space.categories || undefined,
          activeProposals:
            (spaceProposals[id] && spaceProposals[id].active) || undefined,
          proposals:
            (spaceProposals[id] && spaceProposals[id].count) || undefined,
          proposals_1d:
            (spaceProposals[id] && spaceProposals[id].count_1d) || undefined,
          followers:
            (spaceFollowers[id] && spaceFollowers[id].count) || undefined,
          followers_1d:
            (spaceFollowers[id] && spaceFollowers[id].count_1d) || undefined,
          voters_1d: spaceOneDayVoters[id] || undefined
        };
      });
    }
  );
}

async function loadSpaces() {
  console.log('[spaces] Load spaces from db');
  const query = 'SELECT id, settings FROM spaces ORDER BY id ASC';
  db.queryAsync(query).then(result => {
    spaces = Object.fromEntries(
      result.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)])
    );
    const totalSpaces = Object.keys(spaces).length;
    console.log('[spaces] Total spaces', totalSpaces);
  });
}

setTimeout(() => loadSpaces(), 3e3);

setInterval(() => loadSpacesMetrics(), 32e3);
