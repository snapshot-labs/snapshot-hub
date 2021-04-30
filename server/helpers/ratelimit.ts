import crypto from 'crypto';
import { sendError } from './utils';

const interval = 30;
const max = 120;
const requests = {};

export function isRateLimited(key: string, id: string) {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (!requests[key]) requests[key] = {};
  if (!requests[key][id]) requests[key][id] = [];
  requests[key][id] = requests[key][id].filter(
    timestamp => timestamp > ts - interval
  );
  if (requests[key][id].length >= max) {
    console.log('Rate limited', id);
    return true;
  }
  requests[key][id].push(ts);
  return false;
}

export const rateLimit = function(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const id = crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex');
  if (isRateLimited('_', id.slice(0, 7))) return sendError(res, 'rate limited');
  next();
};
