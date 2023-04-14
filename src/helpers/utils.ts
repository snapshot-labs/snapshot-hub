import { createHash } from 'crypto';
import type { Response, Request } from 'express';

export function jsonParse(input: string, fallback?: unknown) {
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export function sendError(res: Response, description: string, status = 500) {
  return res.status(status).json({
    error: 'unauthorized',
    error_description: description
  });
}

export function sha256(str: string) {
  return createHash('sha256').update(str).digest('hex');
}

export function getIp(req: Request) {
  return req.headers['cf-connecting-ip'] || req.ip;
}
