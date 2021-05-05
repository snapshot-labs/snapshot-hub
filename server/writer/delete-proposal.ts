import { archiveProposal, getProposal } from '../helpers/adapters/mysql';
import { getSpaceUri } from '../helpers/ens';
import { spaces } from '../helpers/spaces';
import { jsonParse } from '../helpers/utils';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const proposal = await getProposal(msg.space, msg.payload.proposal);

  let isSpaceAdmin;
  if (
    spaces[msg.space].admins &&
    spaces[msg.space].admins
      .map(admin => admin.toLowerCase())
      .includes(body.address.toLowerCase())
  ) {
    isSpaceAdmin = true;
  } else {
    const spaceUri = await getSpaceUri(msg.space);
    isSpaceAdmin = spaceUri.includes(body.address);
  }

  if (!isSpaceAdmin && proposal.address !== body.address) {
    return Promise.reject('not authorized');
  }
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  await archiveProposal(msg.payload.proposal);
}
