import legacySpaces from '@snapshot-labs/snapshot-spaces';
import { loadSpaces } from './adapters/mysql';

export let spaces = legacySpaces;

loadSpaces().then(ensSpaces => {
  console.log('GitHub spaces', Object.keys(spaces).length);
  console.log('ENS spaces', Object.keys(ensSpaces).length);
  spaces = { ...spaces, ...ensSpaces };
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
