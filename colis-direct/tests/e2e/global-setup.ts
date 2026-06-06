import { getE2EConfig, getRoleCredentials, loadE2EEnv, type E2ERole } from './support/env';
import { getE2EBypassHeaders } from './support/e2e-headers';
import { cacheAuthEntry, readTokenCache, writeTokenCache } from './support/token-cache';

const ROLES: E2ERole[] = ['client', 'admin', 'relay', 'transporter', 'support'];

async function signInRole(apiURL: string, role: E2ERole, index: number) {
  const credentials = getRoleCredentials(role);
  if (!credentials) return;

  const existing = readTokenCache()[credentials.email];
  if (existing?.token) {
    cacheAuthEntry(credentials.email, existing);
    return;
  }

  const response = await fetch(`${apiURL}/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.200.${index + 1}.${index + 10}`,
      ...getE2EBypassHeaders(),
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn(`[e2e setup] Connexion ${role} echouee (${response.status}): ${body}`);
    return;
  }

  const payload = await response.json();
  if (!payload.token) {
    console.warn(`[e2e setup] Connexion ${role} sans token`);
    return;
  }

  cacheAuthEntry(credentials.email, {
    token: payload.token,
    refresh_token: payload.refresh_token,
  });
}

export default async function globalSetup() {
  loadE2EEnv();
  const { apiURL } = getE2EConfig();

  if (process.env.E2E_REFRESH_AUTH_CACHE === 'true') {
    writeTokenCache({});
  }

  for (let i = 0; i < ROLES.length; i += 1) {
    await signInRole(apiURL, ROLES[i], i);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
