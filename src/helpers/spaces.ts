import { getProposals, getFollowers, getOneDayVoters } from './adapters/mysql';
import db from './mysql';

export let spaces = {};
export const spaceProposals = {};
export const spaceFollowers = {};
export const spaceOneDayVoters = {};

export const spaceIdsFailed: string[] = [];

setInterval(() => {
  console.log('[spaces] Load metrics');

  getProposals().then((result: any) =>
    result.forEach(proposals => {
      if (spaces[proposals.space]) {
        spaceProposals[proposals.space] = proposals;
      }
    })
  );

  getFollowers().then((result: any) =>
    result.forEach(followers => {
      if (spaces[followers.space]) {
        spaceFollowers[followers.space] = followers;
      }
    })
  );

  getOneDayVoters().then((result: any) =>
    result.forEach(votes => {
      if (spaces[votes.space]) {
        spaceOneDayVoters[votes.space] = votes.count;
      }
    })
  );
}, 32e3);

setTimeout(() => {
  console.log('[spaces] Load spaces from db');
  const query = 'SELECT id, settings FROM spaces ORDER BY id ASC';
  db.queryAsync(query).then(result => {
    spaces = Object.fromEntries(
      result.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)])
    );
    const totalSpaces = Object.keys(spaces).length;
    const totalPublicSpaces = Object.values(spaces).filter(
      (space: any) => !space.private
    ).length;
    console.log('[spaces] Total spaces', totalSpaces);
    console.log('[spaces] Total public spaces', totalPublicSpaces);
  });
}, 3e3);
