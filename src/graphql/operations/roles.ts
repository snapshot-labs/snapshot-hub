import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../helpers/mysql';
import log from '../../helpers/log';

export default async function (parent, args) {
  const { where = {} } = args;

  const { address } = where;
  if (!address) return Promise.reject(new Error('address is required'));

  const query = `
    SELECT * FROM spaces
    WHERE JSON_CONTAINS(LOWER(settings->'$.admins'), LOWER(?))
      OR JSON_CONTAINS(LOWER(settings->'$.members'), LOWER(?))
      OR JSON_CONTAINS(LOWER(settings->'$.moderators'), LOWER(?));
  `;
  const params: string[] = [`"${address}"`, `"${address}"`, `"${address}"`];

  try {
    const data = await db.queryAsync(query, params);
    return data.map((space: any) => {
      const settings = JSON.parse(space.settings);
      const permissions: string[] = [];
      const admins = (settings.admins || []).map((admin: string) => admin.toLowerCase());
      const moderators = (settings.moderators || []).map((moderator: string) =>
        moderator.toLowerCase()
      );
      const members = (settings.members || []).map((member: string) => member.toLowerCase());

      if (admins.includes(address.toLowerCase())) permissions.push('admin');
      if (moderators.includes(address.toLowerCase())) permissions.push('moderator');
      if (members.includes(address.toLowerCase())) permissions.push('author');

      return { space: space.id, permissions };
    });
  } catch (e: any) {
    log.error(`[graphql] roles, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
