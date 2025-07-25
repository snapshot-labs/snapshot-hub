import log from '../../helpers/log';
import { createLoop } from '../../helpers/loop';
import db from '../../helpers/mysql';

const RUN_INTERVAL = 120e3;

let options = [];

export default async function () {
  return options;
}

createLoop({
  name: 'options',
  interval: RUN_INTERVAL,
  task: async () => {
    options = await db.queryAsync('SELECT s.* FROM options s');
    log.info(`[options] ${options.length} options reloaded`);
  }
});
