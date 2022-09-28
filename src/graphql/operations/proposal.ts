import db from '../../helpers/mysql';
import { formatProposal } from '../helpers';
import log from '../../helpers/log';

export default async function (parent, { id }) {
  const query = `
    SELECT p.*, spaces.settings FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE p.id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  try {
    const proposals = await db.queryAsync(query, [id]);
    return proposals.map(proposal => formatProposal(proposal))[0] || null;
  } catch (e) {
    log.error(`[graphql] proposal, ${JSON.stringify(e)}`);
    return Promise.reject('request failed');
  }
}
