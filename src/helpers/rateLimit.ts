import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';
import { sendError } from './utils';

export default rateLimit({
  windowMs: 10 * 1e3,
  max: 64,
  handler: (req, res) => {
    const id = createHash('sha256')
      .update(req.ip)
      .digest('hex');
    console.log('Too many requests', id.slice(0, 7));
    sendError(res, 'too many requests', 429);
  }
});
