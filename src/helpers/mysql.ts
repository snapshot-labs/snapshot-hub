import mysql from 'mysql';
import Pool from 'mysql/lib/Pool';
import Connection from 'mysql/lib/Connection';
import bluebird from 'bluebird';
import parse from 'connection-string';
import log from './log';

const connectionLimit = parseInt(process.env.CONNECTION_LIMIT || '25');
log.info('[mysql] Connection limit', connectionLimit);

// @ts-ignore
const config = parse(process.env.DATABASE_URL);
config.connectionLimit = connectionLimit;
config.multipleStatements = true;
config.database = config.path[0];
config.host = config.hosts[0].name;
config.port = config.hosts[0].port;
config.connectTimeout = 60e3;
config.acquireTimeout = 60e3;
config.timeout = 60e3;
config.charset = 'utf8mb4';
bluebird.promisifyAll([Pool, Connection]);
const db = mysql.createPool(config);

export default db;
