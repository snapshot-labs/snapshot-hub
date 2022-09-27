import rateLimit from 'express-rate-limit';
import { sendError } from './utils';

export default rateLimit({
  windowMs: 16 * 1e3,
  max: 80,
  handler: (req, res) => {
    // const id = sha256(req.ip);
    sendError(res, 'too many requests', 429);
  }
});
