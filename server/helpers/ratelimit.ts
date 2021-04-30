import { sendError } from './utils';

const interval = 30;
const max = 5;
const requests = {};

export function isRateLimited(key: string, ip: string) {
  const ts = parseInt((Date.now() / 1e3).toFixed());
  if (!requests[key]) requests[key] = {};
  if (!requests[key][ip]) requests[key][ip] = [];
  requests[key][ip] = requests[key][ip].filter(
    timestamp => timestamp > ts - interval
  );
  console.log('Rate limit', ip, requests[key][ip]);
  if (requests[key][ip].length >= max) {
    return true;
  }
  requests[key][ip].push(ts);
  return false;
}

export const rateLimit = function(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (isRateLimited('_', ip)) return sendError(res, 'rate limited');
  next();
};
