import { expect, test } from '@playwright/test';
import { prepareCleanVisitorContext, navigateWithHeader, openHome } from '../support/app';
import { collectBrowserDiagnostics, expectNoCriticalBrowserIssues } from '../support/diagnostics';
import { loginAndOpenDashboard } from '../support/dashboard-helpers';

test.describe('Création envoi — parcours navigateur', () => {
  test('invité peut ouvrir le parcours Envoyer un colis', async ({ page }, testInfo) => {
    await prepareCleanVisitorContext(page);
    const diagnostics = collectBrowserDiagnostics(page);
    await openHome(page);
    await navigateWithHeader(page, /Envoyer un colis/i);

    await expect(page.getByRole('heading', { name: /Créer un envoi/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuer sans se connecter/i })).toBeVisible();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('client connecté atteint le sélecteur de modes de livraison', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);
    const loggedIn = await loginAndOpenDashboard(page, 'client');
    test.skip(!loggedIn, 'Credentials client E2E non configurés.');

    await navigateWithHeader(page, /Envoyer un colis/i);
    await expect(page.getByRole('heading', { name: /Créer un envoi/i }).first()).toBeVisible();

    // Client connecté : compléter l'adresse d'expédition via la modale profil.
    if (await page.getByText(/Informations issues de votre profil/i).isVisible()) {
      await page.getByRole('button', { name: /Changer l'adresse/i }).click();
      await expect(page.getByRole('heading', { name: /Adresse d'expédition/i })).toBeVisible();
      await page.getByRole('button', { name: /Ajouter une adresse/i }).click();
      const newAddressPanel = page.getByRole('heading', { name: /Nouvelle adresse/i }).locator('..');
      await newAddressPanel.getByPlaceholder(/Numéro et nom de rue/i).fill('Rue test expéditeur');
      await newAddressPanel.locator('select').first().selectOption({ label: 'Cocody' });
      await newAddressPanel.locator('input[type="text"][required]').fill('Riviera');
      await page.getByRole('button', { name: /^Ajouter$/i }).click();
    } else {
      await page.locator('input[name="sender_last_name"]').fill('Dupont');
      await page.locator('input[name="sender_first_name"]').fill('Jean');
      await page.locator('input[name="sender_quartier"]').fill('Riviera');
      await page.locator('textarea[name="sender_address"]').fill('Rue test expéditeur');
      await page.locator('select[name="sender_commune"]').selectOption({ label: 'Cocody' });
    }

    await page.locator('input[name="recipient_last_name"]').fill('Konan');
    await page.locator('input[name="recipient_first_name"]').fill('Marie');
    await page.locator('input[name="recipient_quartier"]').fill('Zone 4');
    await page.locator('textarea[name="recipient_address"]').fill('Rue test destinataire');
    await page.locator('select[name="recipient_commune"]').selectOption({ label: 'Marcory' });
    await page.locator('input[name="recipient_phone"]').fill('0705060708');

    await page.getByRole('button', { name: /Continuer/i }).click();

    await expect(page.getByText(/Choisissez votre mode de livraison|mode de livraison/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});
