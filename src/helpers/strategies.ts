import snapshot from '@snapshot-labs/snapshot.js';
import { spaces } from './spaces';

export let strategies: any[] = [];
export let strategiesObj: any = {};

const uri = 'https://score.snapshot.org/api/strategies';

async function loadStrategies() {
  console.log('[strategies] Load strategies');
  const res = await snapshot.utils.getJSON(uri);

  Object.values(spaces).forEach((space: any) => {
    const ids = new Set<string>(
      space.strategies.map(strategy => strategy.name)
    );
    ids.forEach(id => {
      if (res[id]) {
        res[id].spacesCount = res[id].spacesCount || 0;
        res[id].spacesCount++;
      }
    });
  });

  strategies = Object.values(res)
    .map((strategy: any) => {
      strategy.id = strategy.key;
      strategy.spacesCount = strategy.spacesCount || 0;
      return strategy;
    })
    .sort((a, b): any => b.spacesCount - a.spacesCount);

  strategiesObj = Object.fromEntries(
    strategies.map(strategy => [strategy.id, strategy])
  );
}

setInterval(async () => await loadStrategies(), 24e3);

loadStrategies();
