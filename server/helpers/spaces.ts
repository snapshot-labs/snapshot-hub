import legacySpaces from '@snapshot-labs/snapshot-spaces/spaces/legacy.json';
import { getActiveProposals } from './adapters/mysql';
import db from './mysql';

export let spaces = legacySpaces;
console.log('Total GitHub spaces', Object.keys(spaces).length);

export const spaceIdsFailed: string[] = [];

setInterval(() => {
  getActiveProposals().then((result: any) =>
    result.forEach(count => {
      if (spaces[count.space])
        spaces[count.space]._activeProposals = count.count;
    })
  );
}, 30e3);

setTimeout(() => {
  console.log('Load spaces from db');
  const query =
    'SELECT id, settings FROM spaces WHERE settings IS NOT NULL ORDER BY id ASC';
  db.queryAsync(query).then(result => {
    const ensSpaces = Object.fromEntries(
      result.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)])
    );
    spaces = { ...legacySpaces, ...ensSpaces };
    const totalSpaces = Object.keys(spaces).length;
    const totalPublicSpaces = Object.values(spaces).filter(
      (space: any) => !space.private
    ).length;
    console.log('Total spaces', totalSpaces);
    console.log('Total public spaces', totalPublicSpaces);
  });
}, 2e3);
