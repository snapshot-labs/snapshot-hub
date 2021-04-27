import legacySpaces from '@snapshot-labs/snapshot-spaces';
import { getActiveProposals, loadSpaces } from './adapters/mysql';

export const spaces = legacySpaces;
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
