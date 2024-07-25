import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { formatProposal } from '../helpers';

export default async function (parent, { id }) {
  const query = `
    SELECT p.*,
      spaces.settings,
      spaces.flagged as spaceFlagged,
      spaces.verified as spaceVerified,
      spaces.turbo as spaceTurbo,
      spaces.hibernated as spaceHibernated
    FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    WHERE p.id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  try {
    const proposals = await db.queryAsync(query, [id]);
    return proposals.map(proposal => formatProposal(proposal))[0] || null;
  } catch (e: any) {
    log.error(`[graphql] proposal, ${JSON.stringify(e)}`);
    capture(e, { id });
    return Promise.reject(new Error('request failed'));
  }
}
