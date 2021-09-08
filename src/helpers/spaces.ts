import { getActiveProposals, getFollowers } from './adapters/mysql';
import db from './mysql';

export let spaces = {};
export const spacesActiveProposals = {};
export const spaceFollowers = {};

export const spaceIdsFailed: string[] = [];

setInterval(() => {
  getActiveProposals().then((result: any) =>
    result.forEach(count => {
      if (spaces[count.space]) {
        spaces[count.space]._activeProposals = count.count;
        spacesActiveProposals[count.space] = count.count;
      }
    })
  );
}, 20e3);

setInterval(() => {
  getFollowers().then((result: any) =>
    result.forEach(followers => {
      if (spaces[followers.space]) {
        spaceFollowers[followers.space] = followers.count;
      }
    })
  );
}, 20e3);

setTimeout(() => {
  console.log('Load spaces from db');
  const query =
    'SELECT id, settings FROM spaces WHERE settings IS NOT NULL ORDER BY id ASC';
  db.queryAsync(query).then(result => {
    spaces = Object.fromEntries(
      result.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)])
    );
    const totalSpaces = Object.keys(spaces).length;
    const totalPublicSpaces = Object.values(spaces).filter(
      (space: any) => !space.private
    ).length;
    console.log('Total spaces', totalSpaces);
    console.log('Total public spaces', totalPublicSpaces);
  });
}, 2e3);
