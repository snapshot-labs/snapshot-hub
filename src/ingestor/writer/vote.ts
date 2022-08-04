import snapshot from '@snapshot-labs/snapshot.js';
import { getAddress } from '@ethersproject/address';
import { jsonParse } from '../../helpers/utils';
import { getProposal } from '../../helpers/actions';
import db from '../../helpers/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(snapshot.schemas.vote, msg.payload);
  if (schemaIsValid !== true) {
    console.log('[writer] Wrong vote format', schemaIsValid);
    return Promise.reject('wrong vote format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const tsInt = (Date.now() / 1e3).toFixed();
  const msgTs = parseInt(msg.timestamp);
  if (
    msgTs > proposal.end ||
    proposal.start > msgTs ||
    tsInt > proposal.end ||
    proposal.start > tsInt
  )
    return Promise.reject('not in voting window');

  if (proposal.privacy === 'shutter') {
    if (typeof msg.payload.choice !== 'string') return Promise.reject('invalid choice');
  } else {
    if (
      (!proposal.type || proposal.type === 'single-choice' || proposal.type === 'basic') &&
      (typeof msg.payload.choice !== 'number' || msg.payload.choice < 1)
    )
      return Promise.reject('invalid choice');

    if (
      ['approval', 'ranked-choice'].includes(proposal.type) &&
      (!Array.isArray(msg.payload.choice) || Math.min(...msg.payload.choice) < 1)
    )
      return Promise.reject('invalid choice');

    if (['weighted', 'quadratic'].includes(proposal.type)) {
      if (
        typeof msg.payload.choice !== 'object' ||
        Math.min(...Object.keys(msg.payload.choice).map((choice) => Number(choice))) < 1
      )
        return Promise.reject('invalid choice');

      let choiceIsValid = true;
      Object.values(msg.payload.choice).forEach((value) => {
        if (typeof value !== 'number' || value < 0) choiceIsValid = false;
      });
      if (!choiceIsValid) return Promise.reject('invalid choice');
    }
  }

  try {
    const result = await snapshot.utils.getVp(
      body.address,
      proposal.network,
      jsonParse(proposal.strategies),
      proposal.snapshot,
      msg.space,
      proposal.delegation === 1,
      {}
    );
    if (result.vp === 0) return Promise.reject('no voting power');
  } catch (e) {
    console.log(
      '[writer] Failed to check voting power (vote)',
      msg.space,
      body.address,
      proposal.snapshot,
      e
    );
    return Promise.reject('failed to check voting power');
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  const voter = getAddress(body.address);
  const created = parseInt(msg.timestamp);
  const choice = JSON.stringify(msg.payload.choice);
  const metadata = JSON.stringify(msg.payload.metadata || {});
  const params = {
    id,
    ipfs,
    voter,
    created,
    space: msg.space,
    proposal: msg.payload.proposal,
    choice,
    metadata,
    vp: 0,
    vp_by_strategy: JSON.stringify([]),
    vp_state: '',
    cb: 0
  };

  // Check if voter already voted
  const votes = await db.queryAsync(
    'SELECT id, created FROM votes WHERE voter = ? AND proposal = ? AND space = ? ORDER BY created DESC LIMIT 1',
    [voter, msg.payload.proposal, msg.space]
  );

  // Reject vote with later timestamp
  if (votes[0]) {
    if (votes[0].created > parseInt(msg.timestamp)) {
      return Promise.reject('already voted at later time');
    } else if (votes[0].created === parseInt(msg.timestamp)) {
      const localCompare = id.localeCompare(votes[0].id);
      if (localCompare <= 0) return Promise.reject('already voted same time with lower index');
    }
    // Update previous vote
    console.log('Update previous vote', voter, msg.payload.proposal);
    await db.queryAsync(
      `
      UPDATE votes
      SET id = ?, ipfs = ?, created = ?, choice = ?, metadata = ?
      WHERE voter = ? AND proposal = ? AND space = ?
    `,
      [id, ipfs, created, choice, metadata, voter, msg.payload.proposal, msg.space]
    );
  } else {
    // Store vote in dedicated table
    await db.queryAsync('INSERT IGNORE INTO votes SET ?', params);
  }
  console.log('[writer] Store vote complete', msg.space, id, ipfs);
}
