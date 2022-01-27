import rateLimit from 'express-rate-limit';
import { sendError, sha256 } from './utils';

export default rateLimit({
  windowMs: 16 * 1e3,
  max: 64,
  handler: (req, res) => {
    const id = sha256(req.ip);
    console.log('Too many requests', id.slice(0, 7));
    sendError(res, 'too many requests', 429);
  }
});
