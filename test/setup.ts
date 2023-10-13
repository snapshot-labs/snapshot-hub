import { default as db, sequencerDB } from '../src/helpers/mysql';

const setup = async () => {
  try {
    await db.queryAsync('SELECT 1 + 1');
    await sequencerDB.queryAsync('SELECT 1 + 1');
  } catch (e: any) {
    if (e.code === 'ER_BAD_DB_ERROR') {
      console.error('Test database not setup, please run `yarn test:setup`');
      throw new Error('Test database not setup');
    }
  }
};

export default setup;
