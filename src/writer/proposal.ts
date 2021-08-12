import snapshot from '@snapshot-labs/snapshot.js';
import { storeProposal } from '../helpers/adapters/mysql';
import { sendMessage } from '../helpers/discord';
import { jsonParse } from '../helpers/utils';
import { spaces } from '../helpers/spaces';

const network = process.env.NETWORK || 'testnet';
const serviceDiscord = parseInt(process.env.SERVICE_DISCORD || '0');

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
  space.id = msg.space;
  try {
    const validationName = space.validation?.name || 'basic';
    const validationParams = space.validation?.params || {};
    const isValid = await snapshot.utils.validations[validationName](
      body.address,
      space,
      msg.payload,
      validationParams
    );
    if (!isValid) return Promise.reject('validation failed');
  } catch (e) {
    return Promise.reject('failed to check validation');
  }
}

export async function action(body, ipfs, receipt, id): Promise<void> {
  const msg = jsonParse(body.msg);
  await storeProposal(msg.space, body, ipfs, receipt, id);

  if (serviceDiscord) {
    const networkStr = network === 'testnet' ? 'demo.' : '';
    let message = `${msg.space} (${network})\n`;
    message += `**${msg.payload.name}**\n`;
    message += `<https://${networkStr}snapshot.org/#/${msg.space}/proposal/${id}>`;
    sendMessage(message);
  }
}
