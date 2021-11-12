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

    if (proposal.scores_state === 'final') {
      return {
        scores_state: proposal.scores_state,
        scores: proposal.scores,
        scores_by_strategy: proposal.scores_by_strategy,
        scores_total: proposal.scores_total
      };
    }

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
    votes = votes.map((vote: any) => {
      vote.scores = proposal.strategies.map(
        (strategy, i) => scores[i][vote.voter] || 0
      );
      vote.balance = vote.scores.reduce((a, b: any) => a + b, 0);
      return vote;
    });

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

    // Store vp
    if (results.scores_state === 'final') {
      const max = 256;
      const pages = Math.ceil(votes.length / max);
      const votesInPages: any = [];
      Array.from(Array(pages)).forEach((x, i) => {
        votesInPages.push(votes.slice(max * i, max * (i + 1)));
      });

      let i = 0;
      for (const votesInPage of votesInPages) {
        const params: any = [];
        let query2 = '';
        votesInPage.forEach((vote: any) => {
          query2 += `UPDATE votes
        SET vp = ?, vp_by_strategy = ?, vp_state = ?
        WHERE id = ? AND proposal = ? LIMIT 1; `;
          params.push(vote.balance);
          params.push(JSON.stringify(vote.scores));
          params.push(results.scores_state);
          params.push(vote.id);
          params.push(proposalId);
        });
        await db.queryAsync(query2, params);
        if (i) await snapshot.utils.sleep(200);
        i++;
        console.log('Updated votes');
      }

      console.log('Votes updated', votes.length);
    }

    // Store scores
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
    console.log('Proposal', results.scores_state);

    return results;
  } catch (e) {
    console.log('> Failed!', proposalId);

    const ts = (Date.now() / 1e3).toFixed();
    const query = `
      UPDATE proposals
      SET scores_state = ?,
      scores_updated = ?
      WHERE id = ? LIMIT 1;
    `;
    await db.queryAsync(query, ['invalid', ts, proposalId]);
    console.log('Proposal invalid');

    return { scores_state: 'invalid' };
  }
}

async function run() {
  const [
    proposal
  ] = await db.queryAsync(
    'SELECT id FROM proposals WHERE scores_state = ? ORDER BY created ASC LIMIT 1',
    ['']
  );
  if (proposal && proposal.id) {
    console.log('Get proposal', proposal.id);
    await getProposalScores(proposal.id);
    await run();
  }
}

snapshot.utils.sleep(5000).then(() => run());
