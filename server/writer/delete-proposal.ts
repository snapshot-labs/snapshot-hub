import { archiveProposal, getProposal } from '../helpers/adapters/mysql';
import { jsonParse } from '../helpers/utils';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (proposal.address !== body.address) return Promise.reject('wrong signer');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  await archiveProposal(msg.payload.proposal);
}
