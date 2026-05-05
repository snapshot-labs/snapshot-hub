import bluebird from 'bluebird';
import parse from 'connection-string';
import mysql from 'mysql2';
import log from './log';

const { Pool, Connection } = mysql as any;
bluebird.promisifyAll([Pool, Connection]);

const connectionLimit = parseInt(process.env.CONNECTION_LIMIT || '25');
log.info(`[mysql] connection limit ${connectionLimit}`);

// @ts-ignore
const hubConfig = parse(process.env.HUB_DATABASE_URL);
hubConfig.connectionLimit = connectionLimit;
hubConfig.multipleStatements = true;
hubConfig.database = hubConfig.path[0];
hubConfig.host = hubConfig.hosts[0].name;
hubConfig.port = hubConfig.hosts[0].port;
hubConfig.connectTimeout = 60e3;
hubConfig.acquireTimeout = 60e3;
hubConfig.timeout = 60e3;
hubConfig.charset = 'utf8mb4';
hubConfig.ssl = { rejectUnauthorized: hubConfig.host !== 'localhost' };

const hubDB: any = mysql.createPool(hubConfig);

// @ts-ignore
const sequencerConfig = parse(process.env.SEQ_DATABASE_URL);
sequencerConfig.connectionLimit = connectionLimit;
sequencerConfig.multipleStatements = true;
sequencerConfig.database = sequencerConfig.path[0];
sequencerConfig.host = sequencerConfig.hosts[0].name;
sequencerConfig.port = sequencerConfig.hosts[0].port;
sequencerConfig.connectTimeout = 60e3;
sequencerConfig.acquireTimeout = 60e3;
sequencerConfig.timeout = 60e3;
sequencerConfig.charset = 'utf8mb4';
sequencerConfig.ssl = {
  rejectUnauthorized: sequencerConfig.host !== 'localhost'
};

const sequencerDB: any = mysql.createPool(sequencerConfig);

export const closeDatabase = (): Promise<void> => {
  return new Promise(resolve => {
    hubDB.end(() => {
      sequencerDB.end(() => {
        log.info('[mysql] Database connection pools closed');
        resolve();
      });
    });
  });
};

export { hubDB as default, sequencerDB };
