import bluebird from 'bluebird';
import parse from 'connection-string';
import mysql from 'mysql';
import Connection from 'mysql/lib/Connection';
import Pool from 'mysql/lib/Pool';
import log from './log';

const connectionLimit = parseInt(process.env.CONNECTION_LIMIT || '25');
export const QUERY_TIMEOUT_MS = 3e4; // 30 seconds

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
hubConfig.charset = 'utf8mb4';
hubConfig.ssl = { rejectUnauthorized: true };

const hubDB = mysql.createPool(hubConfig);

// @ts-ignore
const sequencerConfig = parse(process.env.SEQ_DATABASE_URL);
sequencerConfig.connectionLimit = connectionLimit;
sequencerConfig.multipleStatements = true;
sequencerConfig.database = sequencerConfig.path[0];
sequencerConfig.host = sequencerConfig.hosts[0].name;
sequencerConfig.port = sequencerConfig.hosts[0].port;
sequencerConfig.connectTimeout = 60e3;
sequencerConfig.acquireTimeout = 60e3;
sequencerConfig.charset = 'utf8mb4';
sequencerConfig.ssl = { rejectUnauthorized: true };

const sequencerDB = mysql.createPool(sequencerConfig);

bluebird.promisifyAll([Pool, Connection]);

const originalQueryAsync = hubDB.queryAsync;
hubDB.queryAsync = function (sql: string, values?: any) {
  return originalQueryAsync.call(this, {
    sql: sql,
    values: values,
    timeout: QUERY_TIMEOUT_MS
  });
};

const originalSequencerQueryAsync = sequencerDB.queryAsync;
sequencerDB.queryAsync = function (sql: string, values?: any) {
  return originalSequencerQueryAsync.call(this, {
    sql: sql,
    values: values,
    timeout: QUERY_TIMEOUT_MS
  });
};

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
