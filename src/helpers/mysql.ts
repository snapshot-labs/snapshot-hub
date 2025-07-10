import bluebird from 'bluebird';
import parse from 'connection-string';
import mysql from 'mysql';
import Connection from 'mysql/lib/Connection';
import Pool from 'mysql/lib/Pool';
import log from './log';

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
sequencerConfig.timeout = 60e3;
sequencerConfig.charset = 'utf8mb4';
const sequencerDB = mysql.createPool(sequencerConfig);

let envelopDB;
if (process.env.ENVELOP_DATABASE_URL) {
  // @ts-ignore
  const envelopConfig = parse(process.env.ENVELOP_DATABASE_URL);
  envelopConfig.connectionLimit = connectionLimit;
  envelopConfig.multipleStatements = true;
  envelopConfig.database = envelopConfig.path[0];
  envelopConfig.host = envelopConfig.hosts[0].name;
  envelopConfig.port = envelopConfig.hosts[0].port;
  envelopConfig.connectTimeout = 60e3;
  envelopConfig.acquireTimeout = 60e3;
  envelopConfig.timeout = 60e3;
  envelopConfig.charset = 'utf8mb4';
  envelopDB = mysql.createPool(envelopConfig);
}

bluebird.promisifyAll([Pool, Connection]);

export { hubDB as default, sequencerDB, envelopDB };
