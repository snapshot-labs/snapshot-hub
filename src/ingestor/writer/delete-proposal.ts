import { getProposal, getSpace } from '../../helpers/actions';
import { jsonParse } from '../../helpers/utils';
import db from '../../helpers/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const proposal = await getProposal(msg.space, msg.payload.proposal);

  const space = await getSpace(msg.space);
  const admins = (space?.admins || []).map(admin => admin.toLowerCase());
  if (
    !admins.includes(body.address.toLowerCase()) &&
    proposal.author !== body.address
  )
    return Promise.reject('wrong signer');
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);
  const id = msg.payload.proposal;

  const ts = parseInt((Date.now() / 1e3).toFixed());
  const event = {
    id: `proposal/${id}`,
    space: msg.space,
    event: 'proposal/deleted',
    expire: ts
  };

  const query = `
    DELETE FROM proposals WHERE id = ? LIMIT 1;
    DELETE FROM votes WHERE proposal = ?;
    DELETE FROM events WHERE id = ?;
    INSERT IGNORE INTO events SET ?;
  `;
  await db.queryAsync(query, [id, id, `proposal/${id}`, event]);
}
