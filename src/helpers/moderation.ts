import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import { capture } from '@snapshot-labs/snapshot-sentry';

const sidekickURL = process.env.SIDEKICK_URL || 'https://sh5.co';
const moderationURL = `${sidekickURL}/api/moderation`;
let consecutiveFailsCount = 0;

export let flaggedLinks: Array<string> = [];

async function loadModerationData() {
  const res = await snapshot.utils.getJSON(moderationURL);
  flaggedLinks = res?.flaggedLinks;
}

async function run() {
  try {
    await loadModerationData();
    consecutiveFailsCount = 0;
  } catch (e: any) {
    consecutiveFailsCount++;

    if (consecutiveFailsCount >= 5) {
      capture(e, { url: moderationURL });
    }
    log.error(`[moderation] failed to load ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(5e3);
  run();
}

run();
