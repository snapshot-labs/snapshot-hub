import { archiveProposal } from '../helpers/adapters/mysql';
import { jsonParse } from '../helpers/utils';
import db from '../helpers/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const query = `SELECT address FROM messages WHERE type = 'proposal' AND id = ?`;
  const propasalSigner = await db.queryAsync(query, [msg.payload.proposal]);
  if (propasalSigner[0].address !== body.address) {
    return Promise.reject('wrong signer');
  }
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  await archiveProposal(msg.payload.proposal);
}
