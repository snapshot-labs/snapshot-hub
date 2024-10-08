import { capture } from '@snapshot-labs/snapshot-sentry';
import log from '../../helpers/log';
import db from '../../helpers/mysql';

export default async function (_, args) {
  try {
    return await db.queryAsync('SELECT s.* FROM options s');
  } catch (e: any) {
    log.error(`[graphql] options, ${JSON.stringify(e)}`);
    capture(e, { args });
    return Promise.reject(new Error('request failed'));
  }
}
