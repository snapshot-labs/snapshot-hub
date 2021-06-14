import { getProposal } from '../helpers/adapters/mysql';
import { spaces } from '../helpers/spaces';
import { jsonParse } from '../helpers/utils';
import db from '../helpers/mysql';

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);
  const proposal = await getProposal(msg.space, msg.payload.proposal);

  const admins = (spaces[msg.space]?.admins || []).map(admin =>
    admin.toLowerCase()
  );
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
    UPDATE messages SET type = ? WHERE id = ? AND type = 'proposal' LIMIT 1;
    DELETE FROM proposals WHERE id = ? LIMIT 1;
    DELETE FROM votes WHERE proposal = ?;
    DELETE FROM events WHERE id = ?;
    INSERT IGNORE INTO events SET ?;
  `;
  await db.queryAsync(query, [
    'archive-proposal',
    id,
    id,
    id,
    `proposal/${id}`,
    event
  ]);
}
