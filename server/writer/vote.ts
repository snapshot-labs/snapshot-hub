import { jsonParse } from '../helpers/utils';
import db from '../helpers/mysql';
import { storeVote } from '../helpers/adapters/mysql';

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

  const query = `SELECT * FROM messages WHERE space = ? AND id = ? AND type = 'proposal'`;
  const proposals = await db.queryAsync(query, [
    msg.space,
    msg.payload.proposal
  ]);
  if (!proposals[0]) return Promise.reject('unknown proposal');
  const payload = jsonParse(proposals[0].payload);

  const msgTs = parseInt(msg.timestamp);
  if (msgTs > payload.end || payload.start > msgTs)
    return Promise.reject('not in voting window');
}

export async function action(
  body,
  authorIpfsHash,
  relayerIpfsHash
): Promise<void> {
  const msg = jsonParse(body.msg);
  await storeVote(msg.space, body, authorIpfsHash, relayerIpfsHash);
}
