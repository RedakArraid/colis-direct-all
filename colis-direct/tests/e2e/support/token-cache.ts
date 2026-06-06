import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { E2ERole } from './env';

export interface CachedAuthEntry {
  token: string;
  refresh_token?: string;
  user_id?: string;
}

export type AuthTokenCache = Record<string, CachedAuthEntry>;

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(E2E_DIR, '..', '.auth-tokens.json');

function decodeJwtPayload(token: string): { id?: string } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenCachePath() {
  return CACHE_FILE;
}

export function readTokenCache(): AuthTokenCache {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as AuthTokenCache;
  } catch {
    return {};
  }
}

export function writeTokenCache(cache: AuthTokenCache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function getCachedAuth(email: string): CachedAuthEntry | null {
  const cache = readTokenCache();
  return cache[email] ?? null;
}

export function cacheAuthEntry(email: string, entry: CachedAuthEntry) {
  const payload = decodeJwtPayload(entry.token);
  const cache = readTokenCache();
  cache[email] = {
    ...entry,
    user_id: entry.user_id || payload?.id,
  };
  writeTokenCache(cache);
}

export function getCachedTokenForRole(role: E2ERole, email: string): string | null {
  const cached = getCachedAuth(email);
  return cached?.token ?? null;
}
