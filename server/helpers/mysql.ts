import mysql from 'mysql';
import Pool from 'mysql/lib/Pool';
import Connection from 'mysql/lib/Connection';
import bluebird from 'bluebird';
// @ts-ignore
import parse from 'connection-string';

const config = parse(process.env.DATABASE_URL);
config.connectionLimit = process.env.CONNECTION_LIMIT || 150;
config.multipleStatements = true;
config.database = config.path[0];
config.host = config.hosts[0].name;
config.charset = 'utf8mb4';
bluebird.promisifyAll([Pool, Connection]);
const db = mysql.createPool(config);

export default db;
