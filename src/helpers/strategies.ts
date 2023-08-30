import snapshot from '@snapshot-labs/snapshot.js';
import { spaces } from './spaces';
import log from './log';
import { capture } from '@snapshot-labs/snapshot-sentry';
import { URL } from 'url';

export let strategies: any[] = [];
export let strategiesObj: any = {};

const scoreApiURL: URL = new URL(process.env.SCORE_API_URL ?? 'https://score.snapshot.org');
scoreApiURL.pathname = '/api/strategies';
const uri = scoreApiURL.toString();

let consecutiveFailsCount = 0;

async function loadStrategies() {
  const res = await snapshot.utils.getJSON(uri);

  if (res.hasOwnProperty('error')) {
    capture(new Error('Failed to load strategies'), { contexts: { input: { uri }, res } });
    return true;
  }

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
    consecutiveFailsCount = 0;
  } catch (e: any) {
    consecutiveFailsCount++;

    if (consecutiveFailsCount >= 3) {
      capture(e);
    }
    log.error(`[strategies] failed to load ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(60e3);
  run();
}

run();
