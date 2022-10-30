import db from './mysql';
import { jsonParse } from './utils';

export async function addOrUpdateSpace(space: string, settings: any) {
  if (!settings || !settings.name) return false;
  const ts = (Date.now() / 1e3).toFixed();
  const query =
    'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?, settings = ?, name = ?';
  await db.queryAsync(query, [
    {
      id: space,
      name: settings.name,
      created_at: ts,
      updated_at: ts,
      settings: JSON.stringify(settings)
    },
    ts,
    JSON.stringify(settings),
    settings.name
  ]);
}

export async function getProposal(space, id) {
  const query = `SELECT * FROM proposals WHERE space = ? AND id = ?`;
  const [proposal] = await db.queryAsync(query, [space, id]);
  proposal.strategies = jsonParse(proposal.strategies);
  proposal.validation = jsonParse(proposal.validation, null);
  proposal.choices = jsonParse(proposal.choices);
  return proposal;
}

export async function getSpace(id) {
  const query = `SELECT settings FROM spaces WHERE id = ? LIMIT 1`;
  const spaces = await db.queryAsync(query, [id]);
  if (!spaces[0]) return false;
  return jsonParse(spaces[0].settings, {});
}
