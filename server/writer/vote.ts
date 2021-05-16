import snapshot from '@snapshot-labs/snapshot.js';
import { spaces } from '../helpers/spaces';
import { jsonParse } from '../helpers/utils';
import { getProposal, storeVote } from '../helpers/adapters/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  if (
    Object.keys(msg.payload).length !== 3 ||
    !msg.payload.proposal ||
    !msg.payload.choice ||
    !msg.payload.metadata
  )
    return Promise.reject('wrong vote format');

  if (
    typeof msg.payload.metadata !== 'object' ||
    JSON.stringify(msg.payload.metadata).length > 1e4
  )
    return Promise.reject('wrong vote metadata');

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const payload = jsonParse(proposal.payload);
  const msgTs = parseInt(msg.timestamp);
  if (msgTs > payload.end || payload.start > msgTs)
    return Promise.reject('not in voting window');

  const space = spaces[msg.space];
  try {
    const scores = await snapshot.utils.getScores(
      msg.space,
      space.strategies,
      space.network,
      snapshot.utils.getProvider(space.network),
      [body.address],
      payload.snapshot
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
      payload.snapshot,
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
