import snapshot from '@snapshot-labs/snapshot.js';
import { spaces } from './spaces';
import log from './log';

export let strategies: any[] = [];
export let strategiesObj: any = {};

const uri = 'https://score.snapshot.org/api/strategies';

async function loadStrategies() {
  const res = await snapshot.utils.getJSON(uri);

  Object.values(spaces).forEach((space: any) => {
    const ids = new Set<string>(space.strategies.map(strategy => strategy.name));
    ids.forEach(id => {
      if (res[id]) {
        res[id].spacesCount = (res[id].spacesCount || 0) + 1;
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

  strategiesObj = Object.fromEntries(strategies.map(strategy => [strategy.id, strategy]));
}

async function run() {
  try {
    await loadStrategies();
  } catch (e) {
    log.error(`[strategies] failed to load ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(60e3);
  run();
}

run();
