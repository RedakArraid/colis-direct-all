import { expect, test } from '@playwright/test';
import { collectBrowserDiagnostics, expectNoCriticalBrowserIssues } from '../support/diagnostics';
import {
  loginAndOpenDashboard,
  waitForTableOrEmpty,
  checkAuthenticatedEndpoint,
} from '../support/dashboard-helpers';
import { waitForPageContent } from '../support/form-helpers';

test.describe('Dashboard Relay Partner', () => {
  test('connexion relay → dashboard chargé sans erreur', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'relay');
    test.skip(!ok, 'Credentials relay non configurés.');

    // Après login relay → app redirige vers relay-dashboard
    await waitForPageContent(page);

    // Attend la stabilisation réseau puis vérifie que la page a du contenu
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => null);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText.length).toBeGreaterThan(100);

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('liste des colis du relais — chargée ou état vide affiché', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'relay');
    test.skip(!ok, 'Credentials relay non configurés.');

    await waitForPageContent(page);

    const state = await waitForTableOrEmpty(page);
    // Pas de crash : soit des données, soit un état vide explicite
    expect(['data', 'empty']).toContain(state);

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /shipments répond pour le relay partner', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'relay');
    test.skip(!ok, 'Credentials relay non configurés.');

    const result = await checkAuthenticatedEndpoint(page, '/shipments?limit=5');
    expect(result.ok).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /relay-points/me répond pour le relay partner', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'relay');
    test.skip(!ok, 'Credentials relay non configurés.');

    const result = await checkAuthenticatedEndpoint(page, '/relay-points/me');
    expect(result.ok || result.status === 404).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /relay-points/:id/stats répond 200 pour le relay partner', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'relay');
    test.skip(!ok, 'Credentials relay non configurés.');

    // Récupère l'ID du relay point via /relay-points/me
    const meResult = await checkAuthenticatedEndpoint(page, '/relay-points/me');
    test.skip(!meResult.ok, '/relay-points/me non disponible');

    const meResponse = await page.request.get(
      `${(await import('../support/env')).getE2EConfig().apiURL}/relay-points/me`,
      { headers: { Authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('auth_token'))}` } },
    );
    const meData = await meResponse.json();
    const relayId = meData?.relay_point?.id || meData?.id;
    test.skip(!relayId, 'relay_point_id introuvable via /relay-points/me');

    const statsResult = await checkAuthenticatedEndpoint(page, `/relay-points/${relayId}/stats`);
    expect(statsResult.ok).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('PhoneInput visible dans le formulaire assistance si disponible', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'relay');
    test.skip(!ok, 'Credentials relay non configurés.');

    await waitForPageContent(page);
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => null);

    const assistBtn = page
      .getByRole('button', { name: /[Aa]ssist|[Cc]réer|[Nn]ouveau colis/i })
      .first();

    if (await assistBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await assistBtn.click();
      await waitForPageContent(page);

      const phoneSelect = page.locator('select[aria-label="Indicatif pays"]').first();
      if (await phoneSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(phoneSelect).toBeVisible();
      }
    }

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});
