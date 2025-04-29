import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from '../../helpers/log';
import db from '../../helpers/mysql';

const RUN_INTERVAL = 120e3;

let options = [];

export default async function () {
  return options;
}

async function loadOptions() {
  options = await db.queryAsync('SELECT s.* FROM options s');
}

async function run() {
  while (true) {
    try {
      log.info('[options] Start options refresh');
      await loadOptions();
      log.info(`[options] ${options.length} options reloaded`);
      log.info('[options] End options refresh');
    } catch (e: any) {
      capture(e);
      log.error(`[options] failed to refresh options, ${JSON.stringify(e)}`);
    }
    await snapshot.utils.sleep(RUN_INTERVAL);
  }
}

run();
