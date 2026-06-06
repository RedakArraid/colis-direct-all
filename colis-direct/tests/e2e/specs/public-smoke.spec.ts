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

    await expect(page.getByRole('button', { name: /Envoyer un colis/i }).first()).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('button', { name: /Suivi de colis/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /S'inscrire/i }).first()).toBeVisible();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('la navigation publique ouvre les pages cles', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);

    await navigateWithHeader(page, /Suivi de colis/i);
    await expect(page.getByRole('heading', { name: /Suivez votre colis/i })).toBeVisible();

    await navigateWithHeader(page, /Points relais/i);
    await expect(page.getByRole('heading', { name: /Points relais/i })).toBeVisible();

    await navigateWithHeader(page, /À propos/i);
    await expect(page.getByRole('heading', { name: /À propos de COLISDIRECT/i })).toBeVisible();

    await navigateWithHeader(page, /Accueil/i);
    await page.getByRole('button', { name: /Voir tous les tarifs/i }).click();
    await expect(page.getByRole('heading', { name: /Des tarifs simples et accessibles/i })).toBeVisible();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('la recherche de suivi vide affiche une validation utilisateur', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);
    await navigateWithHeader(page, /Suivi de colis/i);
    await page.getByRole('button', { name: /Suivre mon colis/i }).first().click();

    await expect(page.getByText(/Veuillez entrer un numéro de suivi/i)).toBeVisible();
    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('un numero connu de suivi peut etre verifie si configure', async ({ page }, testInfo) => {
    test.skip(!e2e.knownTrackingNumber, 'Renseigner E2E_KNOWN_TRACKING_NUMBER pour activer ce test.');

    const diagnostics = collectBrowserDiagnostics(page);

    await openHome(page);
    await navigateWithHeader(page, /Suivi de colis/i);
    await page.getByPlaceholder(/Ex:/i).fill(e2e.knownTrackingNumber!);
    await page.getByRole('button', { name: /Suivre mon colis/i }).first().click();

    await expect(page.getByRole('heading', { name: /Suivi de colis|Suivez votre colis/i })).toBeVisible();
    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});
