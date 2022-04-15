import fetch from 'cross-fetch';

/**
 * Copied from https://github.com/snapshot-labs/snapshot.js/blob/master/src/utils.ts#L147-L173
 * to return the whole result (obj.result) instead of just the scores property (obj.result.scores).
 * This should be implemented in snapshot.js, leading to either a breaking change or a new
 * function, e.g. named getFullScores while getScores still returns just the scores prop.
 */
export async function getScores(
  space: string,
  strategies: any[],
  network: string,
  addresses: string[],
  snapshot: number | string = 'latest',
  scoreApiUrl = 'https://score.snapshot.org/api/scores'
) {
  try {
    const params = {
      space,
      network,
      snapshot,
      strategies,
      addresses
    };
    const res = await fetch(scoreApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params })
    });
    const obj = await res.json();
    return obj.result;
  } catch (e) {
    return Promise.reject(e);
  }
}
