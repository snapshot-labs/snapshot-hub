// import legacySpaces from '@snapshot-labs/snapshot-spaces';
import { getActiveProposals, loadSpaces } from './adapters/mysql';

export let spaces = {};

loadSpaces().then(ensSpaces => {
  console.log('ENS spaces', Object.keys(ensSpaces).length);
  spaces = { ...spaces, ...ensSpaces };
});

setInterval(() => {
  getActiveProposals(spaces).then((result: any) =>
    result.forEach(count => {
      if (spaces[count.space])
        spaces[count.space]._activeProposals = count.count;
    })
  );
}, 30e3);
