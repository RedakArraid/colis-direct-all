import { expect, test } from '@playwright/test';
import { loginWithEmail } from '../support/auth';
import { collectBrowserDiagnostics, expectNoCriticalBrowserIssues } from '../support/diagnostics';
import { getE2EConfig, getRoleCredentials, getRoleUserId, type E2ERole } from '../support/env';

const e2e = getE2EConfig();
const roles: Array<{ envRole: E2ERole; appRole: string }> = [
  { envRole: 'client', appRole: 'client' },
  { envRole: 'admin', appRole: 'admin' },
  { envRole: 'relay', appRole: 'relay_partner' },
  { envRole: 'transporter', appRole: 'transporter' },
  { envRole: 'support', appRole: 'support' },
];

test.describe('Connexions par role staging', () => {
  for (const { envRole, appRole } of roles) {
    test(`connexion ${envRole}`, async ({ page }, testInfo) => {
      const credentials = getRoleCredentials(envRole);
      test.skip(!credentials, `Renseigner E2E_${envRole.toUpperCase()}_EMAIL et E2E_${envRole.toUpperCase()}_PASSWORD.`);

      const diagnostics = collectBrowserDiagnostics(page);
      const authMode = process.env.E2E_AUTH_MODE || 'api';
      const identity =
        authMode === 'jwt'
          ? { id: getRoleUserId(envRole), role: appRole }
          : undefined;
      await loginWithEmail(page, credentials!, identity);

      const currentUser = await page.evaluate(async (apiURL) => {
        const token = window.localStorage.getItem('auth_token');
        const response = await fetch(`${apiURL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`GET /auth/me failed with ${response.status}`);
        }
        return response.json();
      }, e2e.apiURL);

      expect(currentUser.user.role).toBe(appRole);
      await expectNoCriticalBrowserIssues(diagnostics, testInfo);
    });
  }
});
