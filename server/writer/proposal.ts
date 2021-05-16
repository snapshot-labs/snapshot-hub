import snapshot from '@snapshot-labs/snapshot.js';
import { storeProposal } from '../helpers/adapters/mysql';
import { sendMessage } from '../helpers/discord';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';

const network = process.env.NETWORK || 'testnet';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  if (
    Object.keys(msg.payload).length !== 7 ||
    !msg.payload.choices ||
    msg.payload.choices.length < 2 ||
    !msg.payload.snapshot ||
    !msg.payload.metadata
  )
    return Promise.reject('wrong proposal format');

  if (
    !msg.payload.name ||
    msg.payload.name.length > 256 ||
    !msg.payload.body ||
    msg.payload.body.length > 4e4
  )
    return Promise.reject('wrong proposal size');

  if (
    typeof msg.payload.metadata !== 'object' ||
    JSON.stringify(msg.payload.metadata).length > 8e4
  )
    return Promise.reject('wrong proposal metadata');

  if (
    !msg.payload.start ||
    !msg.payload.end ||
    typeof msg.payload.start !== 'number' ||
    typeof msg.payload.end !== 'number' ||
    msg.payload.start.toString().length !== 10 ||
    msg.payload.end.toString().length !== 10 ||
    msg.payload.start >= msg.payload.end
  )
    return Promise.reject('wrong proposal period');

  const space = spaces[msg.space];
  const members = space.members
    ? space.members.map(address => address.toLowerCase())
    : [];
  const isMember = members.includes(body.address.toLowerCase());

  if (space.filters && space.filters.onlyMembers && !isMember) {
    return Promise.reject('not a member');
  } else if (!isMember && space.filters && space.filters.minScore) {
    try {
      const scores = await snapshot.utils.getScores(
        msg.space,
        space.strategies,
        space.network,
        snapshot.utils.getProvider(space.network),
        [body.address]
      );
      const totalScore: any = scores
        .map((score: any) =>
          Object.values(score).reduce((a, b: any) => a + b, 0)
        )
        .reduce((a, b: any) => a + b, 0);
      if (totalScore < space.filters.minScore)
        return Promise.reject('below min. score');
    } catch (e) {
      console.log('Failed to check voting power (proposal)', msg.space, e);
      return Promise.reject('failed to check voting power');
    }
  }
}

export async function action(
  body,
  authorIpfsHash,
  relayerIpfsHash
): Promise<void> {
  const msg = jsonParse(body.msg);
  await storeProposal(msg.space, body, authorIpfsHash, relayerIpfsHash);

  const networkStr = network === 'testnet' ? 'demo.' : '';
  let message = `${msg.space} (${network})\n`;
  message += `**${msg.payload.name}**\n`;
  message += `<https://${networkStr}snapshot.org/#/${msg.space}/proposal/${authorIpfsHash}>`;
  sendMessage(message);
}
