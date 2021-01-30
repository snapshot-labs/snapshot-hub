import legacySpaces from '@snapshot-labs/snapshot-spaces';
import { getActiveProposals, loadSpaces } from './adapters/mysql';

export let spaces = legacySpaces;

loadSpaces().then(ensSpaces => {
  spaces = { ...spaces, ...ensSpaces };
  console.log('Spaces', Object.keys(spaces).length);
});

setInterval(() => {
  getActiveProposals(spaces).then((result: any) =>
    result.forEach(count => {
      if (spaces[count.space])
        spaces[count.space]._activeProposals = count.count;
    })
  );
}, 30e3);
