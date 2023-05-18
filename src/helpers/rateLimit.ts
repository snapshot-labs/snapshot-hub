import rateLimit from 'express-rate-limit';
import { getIp, sendError } from './utils';
import log from './log';
import { keycard } from './keycard';

export default rateLimit({
  windowMs: 20 * 1e3,
  max: 120,
  keyGenerator: req => getIp(req),
  standardHeaders: true,
  skip: req => {
    const key = req.headers['x-api-key'] || req.query.apiKey;
    if (key && keycard.configured) return true;
    return false;
  },
  handler: (req, res) => {
    // const id = sha256(getIp(req));
    log.info(`too many requests ${getIp(req).slice(0, 7)}`);
    sendError(
      res,
      'too many requests, Refer: https://twitter.com/SnapshotLabs/status/1605567222713196544',
      429
    );
  }
});
