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
  return createHash('sha256').update(str).digest('hex');
}

export async function getJSON(uri) {
  const url = snapshot.utils.getUrl(uri);
  return fetch(url).then(res => res.json());
}

export function hasStrategyOverride(strategies: any[]) {
  const overriders = [
    'delegation',
    'erc20-votes-with-override',
    'erc20-balance-of-delegation',
    'aura-balance-of-vlaura-vebal'
  ];
  const names = strategies.map(strategy => strategy.name || '');
  if (names.some(name => overriders.includes(name))) return true;
  if (JSON.stringify(strategies).toLowerCase().includes('delegation')) return true;
  return false;
}
