// @ts-ignore
import rateLimit from 'express-rate-limit';
import { getIp, sendError } from './utils';
import log from './log';

import type { Response, Request } from 'express';

export default rateLimit({
  windowMs: 20 * 1e3,
  max: 60,
  keyGenerator: (req: Request) => getIp(req),
  standardHeaders: true,
  handler: (req: Request, res: Response) => {
    // const id = sha256(getIp(req));
    log.info(`too many requests ${getIp(req).slice(0, 7)}`);
    sendError(res, 'too many requests', 429);
  }
});
