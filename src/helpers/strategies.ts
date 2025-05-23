import { URL } from 'url';
import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import { spacesMetadata } from './spaces';

export let strategies: any[] = [];
export let strategiesObj: any = {};

const RUN_INTERVAL = 60e3;
const scoreApiURL: URL = new URL(
  process.env.SCORE_API_URL ?? 'https://score.snapshot.org'
);
scoreApiURL.pathname = '/api/strategies';
const uri = scoreApiURL.toString();

let consecutiveFailsCount = 0;

async function loadStrategies() {
  const res = await snapshot.utils.getJSON(uri);

  if (res.hasOwnProperty('error')) {
    capture(new Error('Failed to load strategies'), {
      contexts: { input: { uri }, res }
    });
    return true;
  }

  Object.values(spacesMetadata).forEach(({ verified, strategyNames }) => {
    const ids = new Set<string>(strategyNames);
    ids.forEach(id => {
      if (!res[id]) {
        return;
      }

      res[id].spacesCount = (res[id].spacesCount || 0) + 1;

      if (verified) {
        res[id].verifiedSpacesCount = (res[id].verifiedSpacesCount || 0) + 1;
      }
    });
  });

  strategies = Object.values(res)
    .map((strategy: any) => {
      strategy.id = strategy.key;
      strategy.spacesCount = strategy.spacesCount || 0;
      strategy.verifiedSpacesCount = strategy.verifiedSpacesCount || 0;
      strategy.override = strategy.dependOnOtherAddress || false;
      strategy.disabled = strategy.disabled || false;
      return strategy;
    })
    .sort((a, b): any => b.verifiedSpacesCount - a.verifiedSpacesCount);

  strategiesObj = Object.fromEntries(
    strategies.map(strategy => [strategy.id, strategy])
  );
}

async function run() {
  while (true) {
    try {
      log.info('[strategies] Start strategies refresh');
      await loadStrategies();
      consecutiveFailsCount = 0;
      log.info('[strategies] End strategies refresh');
    } catch (e: any) {
      consecutiveFailsCount++;

      if (consecutiveFailsCount >= 3) {
        capture(e);
      }
      log.error(`[strategies] failed to load ${JSON.stringify(e)}`);
    }
    await snapshot.utils.sleep(RUN_INTERVAL);
  }
}

run();
