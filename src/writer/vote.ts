import snapshot from '@snapshot-labs/snapshot.js';
import { jsonParse } from '../helpers/utils';
import { getProposal, storeVote } from '../helpers/adapters/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.vote,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('Wrong vote format', schemaIsValid);
    return Promise.reject('wrong vote format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const msgTs = parseInt(msg.timestamp);
  if (msgTs > proposal.end || proposal.start > msgTs)
    return Promise.reject('not in voting window');

  if (
    (!proposal.type || proposal.type === 'single-choice') &&
    typeof msg.payload.choice !== 'number'
  )
    return Promise.reject('invalid choice');

  if (
    ['approval', 'ranked-choice'].includes(proposal.type) &&
    !Array.isArray(msg.payload.choice)
  )
    return Promise.reject('invalid choice');

  if (
    ['weighted', 'quadratic-choice'].includes(proposal.type) &&
    typeof msg.payload.choice !== 'object'
  )
    return Promise.reject('invalid choice');

  try {
    const scores = await snapshot.utils.getScores(
      msg.space,
      jsonParse(proposal.strategies),
      proposal.network,
      snapshot.utils.getProvider(proposal.network),
      [body.address],
      proposal.snapshot
    );
    const totalScore = scores
      .map((score: any) => Object.values(score).reduce((a, b: any) => a + b, 0))
      .reduce((a, b: any) => a + b, 0);
    if (totalScore === 0) return Promise.reject('no voting power');
  } catch (e) {
    console.log(
      'Failed to check voting power (vote)',
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
  await storeVote(msg.space, body, ipfs, receipt, id);
}
