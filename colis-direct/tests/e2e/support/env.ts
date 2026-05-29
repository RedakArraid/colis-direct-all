import fs from 'node:fs';
import path from 'node:path';

export type E2ERole = 'client' | 'admin' | 'relay' | 'transporter' | 'support';

export interface E2ECredentials {
  email: string;
  password: string;
}

export interface E2EConfig {
  baseURL: string;
  apiOrigin: string;
  apiURL: string;
  ignoreHTTPSErrors: boolean;
  checkFrontendTLS: boolean;
  knownTrackingNumber?: string;
}

const loadedRoots = new Set<string>();

function parseEnvValue(rawValue: string) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadE2EEnv(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  if (loadedRoots.has(root)) return;

  loadEnvFile(path.join(root, '.env.e2e'));
  loadEnvFile(path.join(root, '.env.e2e.local'));
  loadedRoots.add(root);
}

function booleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getE2EConfig(): E2EConfig {
  loadE2EEnv();

  const baseURL = process.env.E2E_BASE_URL || 'https://staging.colisdirect.com';
  const apiOrigin = process.env.E2E_API_ORIGIN || 'https://staging-api.colisdirect.com';
  const apiURL = process.env.E2E_API_URL || `${apiOrigin}/api`;

  return {
    baseURL,
    apiOrigin,
    apiURL,
    ignoreHTTPSErrors: booleanEnv(process.env.E2E_IGNORE_HTTPS_ERRORS, true),
    checkFrontendTLS: booleanEnv(process.env.E2E_CHECK_FRONTEND_TLS, false),
    knownTrackingNumber: process.env.E2E_KNOWN_TRACKING_NUMBER || undefined,
  };
}

export function getRoleCredentials(role: E2ERole): E2ECredentials | null {
  loadE2EEnv();

  const prefix = `E2E_${role.toUpperCase()}_`;
  const email = process.env[`${prefix}EMAIL`];
  const password = process.env[`${prefix}PASSWORD`];

  if (!email || !password) return null;
  return { email, password };
}

export function getRoleUserId(role: E2ERole): string {
  loadE2EEnv();

  const userId = process.env[`E2E_${role.toUpperCase()}_USER_ID`];
  if (!userId) {
    throw new Error(`Missing E2E_${role.toUpperCase()}_USER_ID`);
  }
  return userId;
}
