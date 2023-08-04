import { Keycard } from '@snapshot-labs/keycard';
import { sendError } from './utils';

const keycard = new Keycard({
  app: 'snapshot-hub',
  secret: process.env.KEYCARD_SECRET || '',
  URL: process.env.KEYCARD_URL || 'https://keycard.snapshot.org'
});

const checkKeycard = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (apiKey && keycard.configured) {
    const keycardData = keycard.logReq(apiKey);
    if (!keycardData.valid) return sendError(res, 'invalid api key', 401);

    res.locals.keycardData = keycardData;
    res.set('X-Api-Key-Limit', keycardData.limit);
    res.set('X-Api-Key-Remaining', keycardData.remaining);
    res.set('X-Api-Key-Reset', keycardData.reset);
  }
  return next();
};

export { keycard, checkKeycard };
