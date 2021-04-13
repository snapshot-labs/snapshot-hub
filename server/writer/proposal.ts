import { storeProposal } from '../helpers/adapters/mysql';
import { sendMessage } from '../helpers/discord';
import { jsonParse } from '../helpers/utils';

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
    msg.payload.start >= msg.payload.end
  )
    return Promise.reject('wrong proposal period');
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
