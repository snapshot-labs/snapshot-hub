import * as tls from 'tls';
import bluebird from 'bluebird';
import parse from 'connection-string';
import mysql from 'mysql';
import Connection from 'mysql/lib/Connection';
import Pool from 'mysql/lib/Pool';
import log from './log';

// Bun's TLSSocket._start() is incompatible with mysql's manual socket-upgrade
// path, so swap _startTLS to the public tls.connect({ socket }) API which
// initiates the handshake via the documented contract on both Node and Bun.
(Connection.prototype as any)._startTLS = function _startTLS(
  onSecure: (err: Error | null) => void
) {
  const ssl = this.config.ssl;
  const rejectUnauthorized = ssl.rejectUnauthorized;

  this._socket.removeAllListeners('data');
  this._protocol.removeAllListeners('data');

  const secureSocket: any = tls.connect({
    socket: this._socket,
    servername: this.config.host,
    rejectUnauthorized,
    requestCert: true,
    ca: ssl.ca,
    cert: ssl.cert,
    ciphers: ssl.ciphers,
    crl: ssl.crl,
    key: ssl.key,
    passphrase: ssl.passphrase,
    secureProtocol: ssl.secureProtocol
  });

  let secureEstablished = false;

  secureSocket.on('error', (err: Error) => {
    if (secureEstablished) this._handleNetworkError(err);
    else onSecure(err);
  });

  secureSocket.pipe(this._protocol);
  this._protocol.on('data', (data: Buffer) => secureSocket.write(data));

  secureSocket.on('secureConnect', () => {
    secureEstablished = true;
    onSecure(rejectUnauthorized ? secureSocket.authorizationError : null);
  });
};

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
sequencerConfig.ssl = {
  rejectUnauthorized: sequencerConfig.host !== 'localhost'
};

const sequencerDB = mysql.createPool(sequencerConfig);

bluebird.promisifyAll([Pool, Connection]);

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
