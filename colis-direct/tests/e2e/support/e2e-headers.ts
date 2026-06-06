import { loadE2EEnv } from './env';

/** En-têtes optionnels pour contourner le rate limiter staging (après déploiement backend). */
export function getE2EBypassHeaders(): Record<string, string> {
  loadE2EEnv();
  const key = process.env.E2E_RATE_LIMIT_BYPASS_KEY;
  if (!key) return {};
  return { 'x-e2e-bypass-key': key };
}
