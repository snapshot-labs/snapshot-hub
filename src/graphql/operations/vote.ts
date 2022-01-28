import graphqlFields from 'graphql-fields';
import db from '../../helpers/mysql';
import { formatProposal, formatVote } from '../helpers';

export default async function(parent, { id }, context, info) {
  const requestedFields = info ? graphqlFields(info) : {};
  const query = `
    SELECT v.*, spaces.settings FROM votes v
    INNER JOIN spaces ON spaces.id = v.space
    WHERE v.id = ? AND v.cb = 0 AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  try {
    const votes = await db.queryAsync(query, [id]);
    const result = votes.map(vote => formatVote(vote))[0] || null;
    if (requestedFields.proposal && result?.proposal) {
      const proposalId = result.proposal;
      const query = `
        SELECT p.*, spaces.settings FROM proposals p
        INNER JOIN spaces ON spaces.id = p.space
        WHERE spaces.settings IS NOT NULL AND p.id = ?
      `;
      try {
        const proposals = await db.queryAsync(query, [proposalId]);
        result.proposal = formatProposal(proposals[0]);
      } catch (e) {
        console.log('[graphql]', e);
        return Promise.reject('request failed');
      }
    }
    return result;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
