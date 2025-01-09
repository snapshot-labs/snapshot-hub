import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { buildWhereQuery, checkLimits } from '../helpers';

const COLORS = ['bg', 'link', 'text', 'border', 'heading', 'primary'];

function formatSkins(queryResults) {
  return queryResults.map(skin => {
    skin.colors = Object.fromEntries(
      COLORS.map(color => [color, `#${skin[color]}`])
    );
    return skin;
  });
}

export default async function (parent, args) {
  const { first, skip, where = {} } = args;

  checkLimits(args, 'skins');

  const fields = {
    id: 'string'
  };
  const whereQuery = buildWhereQuery(fields, 's', where);
  const queryStr = whereQuery.query;
  const params: any[] = whereQuery.params;

  const query = `
    SELECT s.* FROM skins s
    WHERE id IS NOT NULL ${queryStr}
    ORDER BY id ASC LIMIT ?, ?
  `;
  params.push(skip, first);

  try {
    return formatSkins(await db.queryAsync(query, params));
  } catch (e: any) {
    log.error(`[graphql] skins, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
