import { expect, test } from '@playwright/test';
import { openHome, prepareCleanVisitorContext, navigateWithHeader } from '../support/app';
import { collectBrowserDiagnostics, expectNoCriticalBrowserIssues } from '../support/diagnostics';
import { getE2EConfig } from '../support/env';

const e2e = getE2EConfig();

test.describe('Parcours publics staging', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanVisitorContext(page);
  });

  test('la page d accueil charge les actions principales', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);

    await expect(page.getByRole('button', { name: /Créer un envoi/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Suivre un colis/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Connexion/i }).first()).toBeVisible();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('la navigation publique ouvre les pages cles', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);

    await navigateWithHeader(page, /Tarifs/i);
    await expect(page.getByRole('heading', { name: /Des tarifs simples et accessibles/i })).toBeVisible();

    await navigateWithHeader(page, /Suivre un colis/i);
    await expect(page.getByRole('heading', { name: /Suivez votre colis/i })).toBeVisible();

    await navigateWithHeader(page, /Comment ça marche/i);
    await expect(page.getByRole('heading', { name: /Comment ça marche/i })).toBeVisible();

    await navigateWithHeader(page, /À propos/i);
    await expect(page.getByRole('heading', { name: /À propos de COLISDIRECT/i })).toBeVisible();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('la recherche de suivi vide affiche une validation utilisateur', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);
    await navigateWithHeader(page, /Suivre un colis/i);
    await page.getByRole('button', { name: /^Suivre$/i }).click();

    await expect(page.getByText(/Veuillez entrer un numéro de suivi/i)).toBeVisible();
    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('un numero connu de suivi peut etre verifie si configure', async ({ page }, testInfo) => {
    test.skip(!e2e.knownTrackingNumber, 'Renseigner E2E_KNOWN_TRACKING_NUMBER pour activer ce test.');

    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);
    await navigateWithHeader(page, /Suivre un colis/i);
    await page.getByPlaceholder(/Ex:/i).fill(e2e.knownTrackingNumber!);
    await page.getByRole('button', { name: /^Suivre$/i }).click();

    await expect(page.getByRole('heading', { name: /Suivi de colis/i })).toBeVisible();
    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});
