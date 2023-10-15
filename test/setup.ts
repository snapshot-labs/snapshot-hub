import { default as db, sequencerDB } from '../src/helpers/mysql';
import { TEST_DATABASE_SUFFIX } from './setupDb';

const setup = async () => {
  try {
    await db.queryAsync('SELECT 1 + 1');
    await sequencerDB.queryAsync('SELECT 1 + 1');

    if (db.config.connectionConfig.database.endsWith(TEST_DATABASE_SUFFIX)) {
      throw new Error(`Hub database name is not ending by ${TEST_DATABASE_SUFFIX}`);
    }

    if (sequencerDB.config.connectionConfig.database.endsWith(TEST_DATABASE_SUFFIX)) {
      throw new Error(`Sequencer database name is not ending by ${TEST_DATABASE_SUFFIX}`);
    }
  } catch (e: any) {
    if (e.code === 'ER_BAD_DB_ERROR') {
      console.error('Test database not setup, please run `yarn test:setup`');
      throw new Error('Test database not setup');
    }
  }
};

export default setup;
