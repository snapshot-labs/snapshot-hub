import fetch from 'cross-fetch';
import { createHash } from 'crypto';
import snapshot from '@snapshot-labs/snapshot.js';

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export function sendError(res, description, status = 500) {
  return res.status(status).json({
    error: 'unauthorized',
    error_description: description
  });
}

export function sha256(str) {
  return createHash('sha256')
    .update(str)
    .digest('hex');
}
