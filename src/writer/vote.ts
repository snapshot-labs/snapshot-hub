import snapshot from '@snapshot-labs/snapshot.js';
import { getAddress } from '@ethersproject/address';
import { jsonParse } from '../helpers/utils';
import { getProposal } from '../helpers/adapters/mysql';
import db from '../helpers/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.vote,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('[writer] Wrong vote format', schemaIsValid);
    return Promise.reject('wrong vote format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const msgTs = parseInt(msg.timestamp);
  if (msgTs > proposal.end || proposal.start > msgTs)
    return Promise.reject('not in voting window');

  if (
    (!proposal.type ||
      proposal.type === 'single-choice' ||
      proposal.type === 'basic') &&
    typeof msg.payload.choice !== 'number'
  )
    return Promise.reject('invalid choice');

  if (
    ['approval', 'ranked-choice'].includes(proposal.type) &&
    !Array.isArray(msg.payload.choice)
  )
    return Promise.reject('invalid choice');

  if (['weighted', 'quadratic'].includes(proposal.type)) {
    if (typeof msg.payload.choice !== 'object')
      return Promise.reject('invalid choice');

    let choiceIsValid = true;
    Object.values(msg.payload.choice).forEach(value => {
      if (typeof value !== 'number' || value < 0) choiceIsValid = false;
    });
    if (!choiceIsValid) return Promise.reject('invalid choice');
  }

  try {
    const scores = await snapshot.utils.getScores(
      msg.space,
      jsonParse(proposal.strategies),
      proposal.network,
      [body.address],
      proposal.snapshot
    );
    const totalScore = scores
      .map((score: any) => Object.values(score).reduce((a, b: any) => a + b, 0))
      .reduce((a, b: any) => a + b, 0);
    if (totalScore === 0) return Promise.reject('no voting power');
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

  const query = 'INSERT IGNORE INTO messages SET ?';
  await db.queryAsync(query, [
    {
      id,
      ipfs,
      address: body.address,
      version: msg.version,
      timestamp: msg.timestamp,
      space: msg.space,
      type: 'vote',
      sig: body.sig,
      receipt
    }
  ]);

  // Store vote in dedicated table
  const params = {
    id,
    ipfs,
    voter: getAddress(body.address),
    created: parseInt(msg.timestamp),
    space: msg.space,
    proposal: msg.payload.proposal,
    choice: JSON.stringify(msg.payload.choice),
    metadata: JSON.stringify(msg.payload.metadata || {}),
    vp: 0,
    vp_by_strategy: JSON.stringify([]),
    vp_state: '',
    cb: 0
  };
  await db.queryAsync('INSERT IGNORE INTO votes SET ?', params);
  console.log('[writer] Store vote complete', msg.space, id, ipfs);
}
