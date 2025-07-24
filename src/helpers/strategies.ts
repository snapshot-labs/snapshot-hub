import { URL } from 'url';
import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { createLoop } from './loop';
import { spacesMetadata } from './spaces';

export let strategies: any[] = [];
export let strategiesObj: any = {};

const RUN_INTERVAL = 60e3;
const scoreApiURL: URL = new URL(
  process.env.SCORE_API_URL ?? 'https://score.snapshot.org'
);
scoreApiURL.pathname = '/api/strategies';
const uri = scoreApiURL.toString();

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

createLoop({
  name: 'strategies',
  interval: RUN_INTERVAL,
  task: async () => {
    await loadStrategies();
  },
  maxConsecutiveFailsBeforeCapture: 3
});
