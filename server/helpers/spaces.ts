import legacySpaces from '@snapshot-labs/snapshot-spaces';
import { loadSpaces } from './adapters/mysql';

export const spaces = legacySpaces;
console.log('GitHub spaces', Object.keys(spaces).length);

loadSpaces().then(ensSpaces => {
  console.log('ENS spaces', Object.keys(ensSpaces).length);
});

/*
setInterval(() => {
  getActiveProposals(spaces).then((result: any) =>
    result.forEach(count => {
      if (spaces[count.space])
        spaces[count.space]._activeProposals = count.count;
    })
  );
}, 30e3);
*/
