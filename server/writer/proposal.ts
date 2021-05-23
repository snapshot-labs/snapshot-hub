import snapshot from '@snapshot-labs/snapshot.js';
import { storeProposal } from '../helpers/adapters/mysql';
import { sendMessage } from '../helpers/discord';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';

const network = process.env.NETWORK || 'testnet';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const schemaIsValid = snapshot.utils.validateSchema(
    snapshot.schemas.proposal,
    msg.payload
  );
  if (schemaIsValid !== true) {
    console.log('Wrong proposal format', schemaIsValid);
    return Promise.reject('wrong proposal format');
  }

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
      console.log(
        'Failed to check voting power (proposal)',
        msg.space,
        body.address,
        e
      );
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
