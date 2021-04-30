import legacySpaces from '@snapshot-labs/snapshot-spaces';
import { getActiveProposals, loadSpaces } from './adapters/mysql';
import db from './mysql';

export let spaces = legacySpaces;
console.log('GitHub spaces', Object.keys(spaces).length);

export const spaceIdsFailed: string[] = [];

loadSpaces().then(ensSpaces => {
  console.log('ENS spaces', Object.keys(ensSpaces).length);
});

setInterval(() => {
  getActiveProposals().then((result: any) =>
    result.forEach(count => {
      if (spaces[count.space])
        spaces[count.space]._activeProposals = count.count;
    })
  );
}, 30e3);

console.log('Load spaces cache from db');
const query =
  'SELECT id, settings FROM spaces WHERE settings IS NOT NULL ORDER BY id ASC';
db.queryAsync(query).then(result => {
  const ensSpaces = Object.fromEntries(
    result.map(ensSpace => [ensSpace.id, JSON.parse(ensSpace.settings)])
  );
  spaces = { ...legacySpaces, ...ensSpaces };
  console.log('Total spaces', Object.keys(spaces).length);
});
