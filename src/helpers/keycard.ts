import { Keycard } from '@snapshot-labs/keycard';
import { sendError } from './utils';

const keycard = new Keycard({
  app: 'snapshot-hub',
  secret: process.env.KEYCARD_SECRET || '',
  URL: process.env.KEYCARD_URL || 'https://keycard.snapshot.org'
});

const verifyKeyCard = async (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key && keycard.configured) {
    const { valid, rateLimited } = keycard.logReq(key);

    if (!valid) return sendError(res, 'invalid api key', 401);
    if (rateLimited) return sendError(res, 'too many requests', 429);
  }
  return next();
};

export { keycard, verifyKeyCard };
