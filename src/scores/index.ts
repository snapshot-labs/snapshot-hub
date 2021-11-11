import fetch from 'cross-fetch';
import snapshot from '@snapshot-labs/snapshot.js';
import getProposal from '../graphql/operations/proposal';
import getVotes from '../graphql/operations/votes';
import db from '../helpers/mysql';

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

export async function getProposalScores(proposalId) {
  try {
    // Get proposal
    const proposal = await getProposal({}, { id: proposalId });

    // Get votes
    let votes = await getVotes(
      {},
      { first: 100000, where: { proposal: proposalId } },
      {},
      false
    );
    const voters = votes.map(vote => vote.voter);

    // Get scores
    const { scores, state } = await getScores(
      proposal.space.id,
      proposal.strategies,
      proposal.network,
      voters,
      parseInt(proposal.snapshot)
    );

    // Add vp to votes
    votes = votes
      .map((vote: any) => {
        vote.scores = proposal.strategies.map(
          (strategy, i) => scores[i][vote.voter] || 0
        );
        vote.balance = vote.scores.reduce((a, b: any) => a + b, 0);
        return vote;
      })
      .sort((a, b) => b.balance - a.balance)
      .filter(vote => vote.balance > 0);

    // Get results
    const votingClass = new snapshot.utils.voting[proposal.type](
      proposal,
      votes,
      proposal.strategies
    );
    const results = {
      scores_state: proposal.state === 'closed' ? state : 'pending',
      scores: votingClass.resultsByVoteBalance(),
      scores_by_strategy: votingClass.resultsByStrategyScore(),
      scores_total: votingClass.sumOfResultsBalance()
    };

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
      results.scores_state,
      JSON.stringify(results.scores),
      JSON.stringify(results.scores_by_strategy),
      results.scores_total,
      ts,
      votes.length,
      proposalId
    ]);

    return results;
  } catch (e) {
    console.log('Scores failed', proposalId, e);
    return { scores_state: 'invalid' };
  }
}
