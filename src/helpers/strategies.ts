import snapshot from '@snapshot-labs/snapshot.js';
import { capture } from '@snapshot-labs/snapshot-sentry';
import { URL } from 'url';
import db from '../helpers/mysql';
import log from './log';

export let strategies: any[] = [];

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

  const results = new Map(
    (
      await db.queryAsync(`
        SELECT
          s.name as id,
          COUNT(s.name) as count
        FROM
          spaces,
          JSON_TABLE(
            spaces.settings,
            '$.strategies[*]' COLUMNS (name VARCHAR(40) PATH '$.name')
          ) s
        GROUP BY s.name
        ORDER BY count DESC;
      `)
    ).map(r => [r.id, r.count])
  );

  strategies = Object.values(res)
    .map((strategy: any) => {
      strategy.id = strategy.key;
      strategy.spacesCount = results.get(strategy.id) || 0;
      return strategy;
    })
    .sort((a, b): any => b.spacesCount - a.spacesCount);
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
