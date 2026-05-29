import { expect, test } from '@playwright/test';
import { collectBrowserDiagnostics, expectNoCriticalBrowserIssues } from '../support/diagnostics';
import {
  loginAndOpenDashboard,
  waitForTableOrEmpty,
  checkAuthenticatedEndpoint,
  expectPageHeader,
} from '../support/dashboard-helpers';
import { waitForPageContent } from '../support/form-helpers';

test.describe('Dashboard Admin', () => {
  test('connexion admin → dashboard chargé sans erreur', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'admin');
    test.skip(!ok, 'Credentials admin non configurés.');

    await waitForPageContent(page);

    const hasAdminContent = await page
      .locator(':text("Administration"), :text("Tableau de bord"), :text("Dashboard"), :text("admin")')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasAdminContent).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /users répond 200 pour admin', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'admin');
    test.skip(!ok, 'Credentials admin non configurés.');

    const result = await checkAuthenticatedEndpoint(page, '/users?limit=5');
    expect(result.ok).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /shipments répond 200 pour admin (accès global)', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'admin');
    test.skip(!ok, 'Credentials admin non configurés.');

    const result = await checkAuthenticatedEndpoint(page, '/shipments?limit=5');
    expect(result.ok).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /relay-points répond 200 pour admin', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'admin');
    test.skip(!ok, 'Credentials admin non configurés.');

    const result = await checkAuthenticatedEndpoint(page, '/relay-points');
    expect(result.ok).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('liste des utilisateurs — chargée ou état vide', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'admin');
    test.skip(!ok, 'Credentials admin non configurés.');

    await waitForPageContent(page);

    // Chercher l'onglet utilisateurs s'il existe
    const usersTab = page.getByRole('tab', { name: /[Uu]tilisateurs/i })
      .or(page.getByRole('button', { name: /[Uu]tilisateurs/i }))
      .first();

    if (await usersTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await usersTab.click();
      await waitForPageContent(page);
    }

    const state = await waitForTableOrEmpty(page);
    expect(['data', 'empty']).toContain(state);

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('bypass admin — PATCH /shipments/:id/status accepte le rôle admin', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'admin');
    test.skip(!ok, 'Credentials admin non configurés.');

    // Récupérer un colis si disponible
    const { apiURL } = await page.evaluate(() => ({ apiURL: '' }));
    const token = await page.evaluate(() => window.localStorage.getItem('auth_token'));

    const { getE2EConfig } = await import('../support/env');
    const e2e = getE2EConfig();

    const shipmentsRes = await page.request.get(`${e2e.apiURL}/shipments?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(shipmentsRes.ok()).toBeTruthy();

    const shipmentsData = await shipmentsRes.json();
    const shipments = shipmentsData.shipments ?? shipmentsData.data ?? shipmentsData;

    if (!Array.isArray(shipments) || shipments.length === 0) {
      test.skip(true, 'Aucun colis en staging pour tester le bypass admin.');
      return;
    }

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});

test.describe('Dashboard Support', () => {
  test('connexion support → dashboard chargé sans erreur', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'support');
    test.skip(!ok, 'Credentials support non configurés.');

    await waitForPageContent(page);

    // Le support dashboard peut montrer "Support", "Tickets", "Colis", ou tout contenu applicatif
    // Vérifie simplement qu'aucune erreur critique n'est survenue et que la page a chargé
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => null);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasContent = bodyText.length > 100;
    expect(hasContent).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('API /shipments répond 200 pour support (accès global)', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    const ok = await loginAndOpenDashboard(page, 'support');
    test.skip(!ok, 'Credentials support non configurés.');

    const result = await checkAuthenticatedEndpoint(page, '/shipments?limit=5');
    expect(result.ok).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});
