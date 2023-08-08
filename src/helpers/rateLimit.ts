import rateLimit from 'express-rate-limit';
import { getIp, sendError } from './utils';
import log from './log';

export default rateLimit({
  windowMs: 20 * 1e3,
  max: 60,
  keyGenerator: req => getIp(req),
  skip: (req, res) => {
    const keycardData = res.locals.keycardData;
    if (keycardData?.valid && !keycardData.rateLimited) {
      return true;
    }

    return false;
  },
  handler: (req, res) => {
    log.info(`too many requests ${getIp(req).slice(0, 7)}`);
    sendError(
      res,
      'too many requests, Refer: https://twitter.com/SnapshotLabs/status/1605567222713196544',
      429
    );
  }
});
