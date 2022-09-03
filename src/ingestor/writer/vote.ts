import snapshot from '@snapshot-labs/snapshot.js';
import { getAddress } from '@ethersproject/address';
import { jsonParse } from '../../helpers/utils';
import { getProposal } from '../../helpers/actions';
import db from '../../helpers/mysql';

const voteMonthLimit = 100e3;

async function getRecentVotesCount(space) {
  const query = `
    SELECT COUNT(*) AS count_30d FROM votes 
    WHERE EXISTS (
      SELECT * FROM spaces
      WHERE id = ? AND verified = 0 LIMIT 1
    )
    AND space = ? AND created > (UNIX_TIMESTAMP() - 2592000)
  `;
  return db.queryAsync(query, [space, space]);
}

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(snapshot.schemas.vote, msg.payload);
  if (schemaIsValid !== true) {
    console.log('[writer] Wrong vote format', schemaIsValid);
    return Promise.reject('wrong vote format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  proposal.choices = jsonParse(proposal.choices);
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
    if (!snapshot.utils.voting[proposal.type].isValidChoice(msg.payload.choice, proposal.choices))
      return Promise.reject('invalid choice');
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
  try {
    // Get recent votes of space, for verified space count_30d will be always 0
    const [{ count_30d: votesMonthCount }] = await getRecentVotesCount(msg.space);
    if (votesMonthCount >= voteMonthLimit) return Promise.reject('vote limit reached');
  } catch (e) {
    return Promise.reject('failed to check votes limit');
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  const voter = getAddress(body.address);
  const created = parseInt(msg.timestamp);
  const choice = JSON.stringify(msg.payload.choice);
  const metadata = JSON.stringify(msg.payload.metadata || {});
  const app = msg.payload.app || '';
  const reason = msg.payload.reason || '';
  const params = {
    id,
    ipfs,
    voter,
    created,
    space: msg.space,
    proposal: msg.payload.proposal,
    choice,
    metadata,
    reason,
    app,
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
      SET id = ?, ipfs = ?, created = ?, choice = ?, metadata = ?, app = ?
      WHERE voter = ? AND proposal = ? AND space = ?
    `,
      [id, ipfs, created, choice, metadata, app, voter, msg.payload.proposal, msg.space]
    );
  } else {
    // Store vote in dedicated table
    await db.queryAsync('INSERT IGNORE INTO votes SET ?', params);
  }
  console.log('[writer] Store vote complete', msg.space, id, ipfs);
}
