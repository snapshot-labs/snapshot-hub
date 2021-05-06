import { archiveProposal, getProposal } from '../helpers/adapters/mysql';
import { spaces } from '../helpers/spaces';
import { jsonParse } from '../helpers/utils';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const proposal = await getProposal(msg.space, msg.payload.proposal);

  const admins = (spaces[msg.space].admins || []).map(admin =>
    admin.toLowerCase()
  );
  if (
    !admins.includes(body.address.toLowerCase()) &&
    proposal.address !== body.address
  )
    return Promise.reject('wrong signer');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  await archiveProposal(msg.payload.proposal);
}
