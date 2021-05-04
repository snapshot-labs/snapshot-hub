import { archiveProposal, getProposal } from '../helpers/adapters/mysql';
import { isSpaceAdmin, jsonParse } from '../helpers/utils';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const proposal = await getProposal(msg.space, msg.payload.proposal);
  const spaceAdmin = await isSpaceAdmin(msg.space, body.address);
  if (!spaceAdmin && proposal.address !== body.address) {
    return Promise.reject('not authorized');
  }
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  await archiveProposal(msg.payload.proposal);
}
