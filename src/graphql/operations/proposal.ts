import db from '../../helpers/mysql';
import { formatProposal } from '../helpers';

export default async function (parent, { id }) {
  const query = `
    SELECT
      p.*,
      skins.*,
      p.id AS id,
      spaces.settings,
      spaces.domain as spaceDomain,
      spaces.flagged as spaceFlagged,
      spaces.verified as spaceVerified,
      spaces.turbo as spaceTurbo,
      spaces.turbo_expiration as spaceTurboExpiration,
      spaces.hibernated as spaceHibernated
    FROM proposals p
    INNER JOIN spaces ON spaces.id = p.space
    LEFT JOIN skins ON spaces.id = skins.id
    WHERE p.id = ? AND spaces.settings IS NOT NULL
    LIMIT 1
  `;
  const proposals = await db.queryAsync(query, [id]);
  return proposals.map(proposal => formatProposal(proposal))[0] || null;
}
