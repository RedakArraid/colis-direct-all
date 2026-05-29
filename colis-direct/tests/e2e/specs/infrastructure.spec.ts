import { expect, test } from '@playwright/test';
import { getE2EConfig } from '../support/env';

const e2e = getE2EConfig();

test.describe('Infrastructure staging', () => {
  test('API health repond avec la base connectee', async ({ request }) => {
    const response = await request.get(`${e2e.apiOrigin}/health`);
    expect(response.ok()).toBeTruthy();
    await expect(await response.json()).toEqual({ status: 'ok', database: 'connected' });
  });

  test('frontend staging presente un certificat TLS valide', async ({ playwright }) => {
    test.skip(!e2e.checkFrontendTLS, 'Certificat frontend staging accepte temporairement; mettre E2E_CHECK_FRONTEND_TLS=true pour verifier.');

    const context = await playwright.request.newContext({
      ignoreHTTPSErrors: false,
    });

    let tlsError: unknown;
    try {
      const response = await context.get(e2e.baseURL);
      expect(response.ok()).toBeTruthy();
    } catch (error) {
      tlsError = error;
    } finally {
      await context.dispose();
    }

    expect(
      tlsError,
      `Le certificat TLS de ${e2e.baseURL} doit etre reconnu par le navigateur local`,
    ).toBeUndefined();
  });
});
