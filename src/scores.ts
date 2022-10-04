import fetch from 'cross-fetch';
import snapshot from '@snapshot-labs/snapshot.js';
import db from './helpers/mysql';
import { hasStrategyOverride, sha256 } from './helpers/utils';
import log from './helpers/log';

async function getProposal(id: string): Promise<any | undefined> {
  const query = 'SELECT * FROM proposals WHERE id = ? LIMIT 1';
  const [proposal] = await db.queryAsync(query, [id]);
  if (!proposal) return;
  proposal.strategies = JSON.parse(proposal.strategies);
  proposal.plugins = JSON.parse(proposal.plugins);
  proposal.choices = JSON.parse(proposal.choices);
  proposal.scores = JSON.parse(proposal.scores);
  proposal.scores_by_strategy = JSON.parse(proposal.scores_by_strategy);
  let proposalState = 'pending';
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (ts > proposal.start) proposalState = 'active';
  if (ts > proposal.end) proposalState = 'closed';
  proposal.state = proposalState;
  return proposal;
}

async function getVotes(proposalId: string): Promise<any[] | undefined> {
  const query =
    'SELECT id, choice, voter, vp, vp_by_strategy, vp_state FROM votes WHERE proposal = ?';
  const votes = await db.queryAsync(query, [proposalId]);
  return votes.map(vote => {
    vote.choice = JSON.parse(vote.choice);
    vote.vp_by_strategy = JSON.parse(vote.vp_by_strategy);
    vote.balance = vote.vp;
    vote.scores = vote.vp_by_strategy;
    return vote;
  });
}

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

async function updateVotesVp(votes: any[], vpState: string, proposalId: string) {
  const votesWithChange = votes.filter(vote => {
    const key1 = sha256(JSON.stringify([vote.balance, vote.scores, vpState]));
    const key2 = sha256(JSON.stringify([vote.vp, vote.vp_by_strategy, vote.vp_state]));
    return key1 !== key2;
  });
  if (votesWithChange.length === 0) return;

  const max = 200;
  const pages = Math.ceil(votesWithChange.length / max);
  const votesInPages: any = [];
  Array.from(Array(pages)).forEach((x, i) => {
    votesInPages.push(votesWithChange.slice(max * i, max * (i + 1)));
  });

  let i = 0;
  for (const votesInPage of votesInPages) {
    const params: any = [];
    let query = '';
    votesInPage.forEach((vote: any) => {
      query += `UPDATE votes
      SET vp = ?, vp_by_strategy = ?, vp_state = ?
      WHERE id = ? AND proposal = ? LIMIT 1; `;
      params.push(vote.balance);
      params.push(JSON.stringify(vote.scores));
      params.push(vpState);
      params.push(vote.id);
      params.push(proposalId);
    });
    await db.queryAsync(query, params);
    if (i) await snapshot.utils.sleep(200);
    i++;
  }
  log.info(`[scores] updated votes vp, ${votesWithChange.length}/${votes.length} on ${proposalId}`);
}

async function updateProposalScores(proposalId: string, scores: any, votes: number) {
  const ts = (Date.now() / 1e3).toFixed();
  const query = `
    UPDATE proposals
    SET scores_state = ?,
    scores = ?,
    scores_by_strategy = ?,
    scores_total = ?,
    scores_updated = ?,
    votes = ?
    WHERE id = ? LIMIT 1;
  `;
  await db.queryAsync(query, [
    scores.scores_state,
    JSON.stringify(scores.scores),
    JSON.stringify(scores.scores_by_strategy),
    scores.scores_total,
    ts,
    votes,
    proposalId
  ]);
}

export async function updateProposalAndVotes(proposalId: string, force = false) {
  const proposal = await getProposal(proposalId);
  if (!proposal || (!force && proposal.privacy === 'shutter')) return false;
  if (proposal.scores_state === 'final') return true;

  // Get votes
  let votes: any = await getVotes(proposalId);
  const isFinal = votes.every(vote => vote.vp_state === 'final');
  let vpState = 'final';

  if (!isFinal) {
    log.info(`[scores] Get scores', ${proposalId}`);

    // Get scores
    const { scores, state } = await getScores(
      proposal.space,
      proposal.strategies,
      proposal.network,
      votes.map(vote => vote.voter),
      parseInt(proposal.snapshot)
    );
    vpState = state;

    // Add vp to votes
    votes = votes.map((vote: any) => {
      vote.scores = proposal.strategies.map((strategy, i) => scores[i][vote.voter] || 0);
      vote.balance = vote.scores.reduce((a, b: any) => a + b, 0);
      return vote;
    });
  }

  // Get results
  const voting = new snapshot.utils.voting[proposal.type](proposal, votes, proposal.strategies);
  const results = {
    scores_state: proposal.state === 'closed' ? 'final' : 'pending',
    scores: voting.getScores(),
    scores_by_strategy: voting.getScoresByStrategy(),
    scores_total: voting.getScoresTotal()
  };

  // Check if voting power is final
  const withOverride = hasStrategyOverride(proposal.strategies);
  if (vpState === 'final' && withOverride && proposal.state !== 'closed') vpState = 'pending';

  // Update votes voting power
  if (!isFinal) await updateVotesVp(votes, vpState, proposalId);

  // Store scores
  await updateProposalScores(proposalId, results, votes.length);
  log.info(
    `[scores] Proposal updated ${proposal.id}, ${proposal.space}, ${results.scores_state}, ${votes.length}`
  );

  return true;
}
