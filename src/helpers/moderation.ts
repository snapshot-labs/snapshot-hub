import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';

const moderationURL =
  'https://sh5.co/api/moderation?fields=flaggedLinks,flaggedProposals,flaggedSpaces,verifiedSpaces';

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
  } catch (e) {
    log.error(`[moderation] failed to load ${JSON.stringify(e)}`);
  }
  await snapshot.utils.sleep(60e3);
  run();
}

run();
