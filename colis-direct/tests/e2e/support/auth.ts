import { expect, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import type { E2ECredentials } from './env';
import { getE2EConfig, loadE2EEnv } from './env';

interface LoginIdentity {
  id: string;
  role: string;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwtToken(credentials: E2ECredentials, identity: LoginIdentity, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const payload = {
    id: identity.id,
    email: credentials.email,
    role: identity.role,
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = base64Url(
    crypto
      .createHmac('sha256', secret)
      .update(unsigned)
      .digest(),
  );

  return `${unsigned}.${signature}`;
}

function randomForwardedFor() {
  const second = Math.floor(Math.random() * 200) + 1;
  const third = Math.floor(Math.random() * 200) + 1;
  const fourth = Math.floor(Math.random() * 200) + 1;
  return `10.${second}.${third}.${fourth}`;
}

async function loginViaApi(page: Page, credentials: E2ECredentials) {
  const e2e = getE2EConfig();
  const response = await page.request.post(`${e2e.apiURL}/auth/signin`, {
    headers: {
      'x-forwarded-for': randomForwardedFor(),
    },
    data: {
      email: credentials.email,
      password: credentials.password,
    },
  });

  expect(response.ok(), `Connexion API echouee: ${response.status()} ${await response.text()}`).toBeTruthy();
  const payload = await response.json();
  expect(payload.token, 'La connexion API doit retourner un token').toBeTruthy();
  return payload.token as string;
}

export async function loginWithEmail(page: Page, credentials: E2ECredentials, identity?: LoginIdentity) {
  loadE2EEnv();

  const authMode = process.env.E2E_AUTH_MODE || 'api';
  const jwtSecret = process.env.E2E_JWT_SECRET;
  let token: string;

  if (authMode === 'jwt') {
    expect(jwtSecret, 'E2E_JWT_SECRET est requis quand E2E_AUTH_MODE=jwt').toBeTruthy();
    expect(identity?.id, 'Un id utilisateur E2E est requis quand E2E_AUTH_MODE=jwt').toBeTruthy();
    expect(identity?.role, 'Un role utilisateur E2E est requis quand E2E_AUTH_MODE=jwt').toBeTruthy();
    token = createJwtToken(credentials, identity!, jwtSecret!);
  } else {
    token = await loginViaApi(page, credentials);
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((token) => {
    window.localStorage.setItem('auth_token', token);
    window.localStorage.removeItem('colisdirect:last-page');
  }, token);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect
    .poll(
      async () => page.evaluate(() => window.localStorage.getItem('auth_token')),
      { message: 'Le token de session doit etre enregistre apres connexion' },
    )
    .toBeTruthy();
}
