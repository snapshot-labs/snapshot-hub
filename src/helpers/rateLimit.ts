import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { getIp, sendError, sha256 } from './utils';
import log from './log';

let client;

(async () => {
  if (!process.env.RATE_LIMIT_DATABASE_URL) return;

  console.log('[redis-rl] Connecting to Redis');
  client = createClient({ url: process.env.RATE_LIMIT_DATABASE_URL });
  client.on('connect', () => console.log('[redis-rl] Redis connect'));
  client.on('ready', () => console.log('[redis-rl] Redis ready'));
  client.on('reconnecting', err => console.log('[redis-rl] Redis reconnecting', err));
  client.on('error', err => console.log('[redis-rl] Redis error', err));
  client.on('end', err => console.log('[redis-rl] Redis end', err));
  await client.connect();
})();

const hashedIp = (ip: string): string => sha256(getIp(ip)).slice(0, 7);

export default rateLimit({
  windowMs: 20 * 1e3,
  max: 60,
  keyGenerator: req => hashedIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    const keycardData = res.locals.keycardData;
    if (keycardData?.valid && !keycardData.rateLimited) {
      return true;
    }

    return false;
  },
  handler: (req, res) => {
    log.info(`too many requests ${hashedIp(req).slice(0, 7)}`);
    sendError(
      res,
      'too many requests, Refer: https://twitter.com/SnapshotLabs/status/1605567222713196544',
      429
    );
  },
  store: client
    ? new RedisStore({
        sendCommand: (...args: string[]) => client.sendCommand(args),
        prefix: 'snapshot-hub:'
      })
    : undefined
});
