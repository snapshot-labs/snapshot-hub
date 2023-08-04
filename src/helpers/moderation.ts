import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import { capture } from '@snapshot-labs/snapshot-sentry';

const moderationURL = 'https://sh5.co/api/moderation';
let consecutiveFailsCount = 0;

export let flaggedLinks: Array<string> = [];
export let flaggedProposals: Array<string> = [];
export let flaggedSpaces: Array<string> = [];
export let verifiedSpaces: Array<string> = [];

async function loadModerationData() {
  const res = await snapshot.utils.getJSON(moderationURL);
  flaggedLinks = res?.flaggedLinks;
  flaggedProposals = res?.flaggedProposals;
  flaggedSpaces = res?.flaggedSpaces;
  verifiedSpaces = res?.verifiedSpaces;
}

async function run() {
  try {
    await loadModerationData();
    consecutiveFailsCount = 0;
  } catch (e: any) {
    consecutiveFailsCount++;

    if (consecutiveFailsCount >= 5) {
      capture(e, { context: { url: moderationURL } });
    }
    log.error(`[moderation] failed to load ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(5e3);
  run();
}

run();
