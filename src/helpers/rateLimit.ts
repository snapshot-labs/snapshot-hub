import rateLimit from 'express-rate-limit';
import { getIp, sendError } from './utils';
import log from './log';

export default rateLimit({
  windowMs: 16 * 1e3,
  max: 80,
  keyGenerator: req => getIp(req),
  handler: (req, res) => {
    // const id = sha256(getIp(req));
    log.info(`too many requests ${getIp(req).slice(0, 7)}`);
    sendError(res, 'too many requests', 429);
  }
});
