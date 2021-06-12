import snapshot from '@snapshot-labs/snapshot.js';
import { spaces } from '../helpers/spaces';
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

  const payload = jsonParse(proposal.payload);
  const msgTs = parseInt(msg.timestamp);
  if (msgTs > payload.end || payload.start > msgTs)
    return Promise.reject('not in voting window');

  if (payload.type) {
    if (
      ['approval', 'ranked-choice'].includes(payload.type) &&
      !Array.isArray(msg.payload.choice)
    )
      return Promise.reject('invalid choice');

    if (payload.type === 'quadratic' && typeof msg.payload.choice !== 'object')
      return Promise.reject('invalid choice');
  }

  const space = spaces[msg.space];
  try {
    const scores = await snapshot.utils.getScores(
      msg.space,
      space.strategies,
      space.network,
      snapshot.utils.getProvider(space.network),
      [body.address]
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
      e
    );
    return Promise.reject('failed to check voting power');
  }
}

export async function action(
  body,
  authorIpfsHash,
  relayerIpfsHash
): Promise<void> {
  const msg = jsonParse(body.msg);
  await storeVote(msg.space, body, authorIpfsHash, relayerIpfsHash);
}
