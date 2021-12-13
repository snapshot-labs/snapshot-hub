import db from '../../helpers/mysql';
import { formatProposal } from '../helpers';

export default async function(parent, { id }) {
  const query = `
    SELECT p.*, spaces.settings, spaces.created_at AS space_created, spaces.updated_at AS space_updated FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE p.id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  try {
    const proposals = await db.queryAsync(query, [id]);
    return proposals.map(proposal => formatProposal(proposal))[0] || null;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
