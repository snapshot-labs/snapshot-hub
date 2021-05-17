import snapshot from '@snapshot-labs/snapshot.js';
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

  const proposal = await getProposal(msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const msgTs = parseInt(msg.timestamp);
  if (msgTs > proposal.end || proposal.start > msgTs)
    return Promise.reject('not in voting window');

  try {
    const scores = await snapshot.utils.getScores(
      msg.space,
      jsonParse(proposal.strategies),
      proposal.network,
      snapshot.utils.getProvider(proposal.network),
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
