import { getAddress } from '@ethersproject/address';
import config from '@/helpers/config';
import pkg from '@/../package.json';

export function shorten(str = '') {
  return `${str.slice(0, 6)}...${str.slice(str.length - 4)}`;
}

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch (err) {
    return fallback || {};
  }
}

export function isValidAddress(str) {
  try {
    getAddress(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

export function trunc(value: number, decimals = 0) {
  const mutiplier = 10 ** decimals;
  return Math.trunc(value * mutiplier) / mutiplier;
}

export function etherscanLink(str: string, type = 'address'): string {
  const network = config.network === 'homestead' ? '' : `${config.network}.`;
  return `https://${network}etherscan.io/${type}/${str}`;
}

export function lsSet(key: string, value: any) {
  return localStorage.setItem(`${pkg.name}.${key}`, JSON.stringify(value));
}

export function lsGet(key: string) {
  const item = localStorage.getItem(`${pkg.name}.${key}`);
  return jsonParse(item, '');
}

export function lsRemove(key: string) {
  return localStorage.removeItem(`${pkg.name}.${key}`);
}
