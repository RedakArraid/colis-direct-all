import { expect, test } from '@playwright/test';
import { collectBrowserDiagnostics, expectNoCriticalBrowserIssues } from '../support/diagnostics';
import { fillPhoneInput, selectPhoneCountry, submitForm, waitForPageContent } from '../support/form-helpers';
import { prepareCleanVisitorContext } from '../support/app';

async function openSignupForm(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Ouvrir la page de connexion via le header
  await page.getByRole('navigation').getByRole('button', { name: /Connexion/i }).first().click();
  await waitForPageContent(page);
  // Basculer vers l'inscription ("Pas encore de compte? Créer un compte")
  await page.getByRole('button', { name: /Créer un compte|S'inscrire|Pas encore/i }).first().click();
  await waitForPageContent(page);
}

test.describe('Inscription client — formulaire', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanVisitorContext(page);
  });

  test('le formulaire inscription affiche les champs attendus', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openSignupForm(page);

    await expect(page.getByPlaceholder(/Prénom/i).or(page.getByLabel(/Prénom/i))).toBeVisible();
    await expect(page.getByPlaceholder(/Nom/i).or(page.getByLabel(/Nom/i)).first()).toBeVisible();
    await expect(page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i)).first()).toBeVisible();
    await expect(page.locator('input[inputmode="numeric"]').first()).toBeVisible();
    // Le placeholder du mot de passe est "••••••••", utiliser le type password
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test("le sélecteur de pays PhoneInput est présent avec la Côte d'Ivoire par défaut", async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openSignupForm(page);

    const countrySelect = page.locator('select[aria-label="Indicatif pays"]').first();
    await expect(countrySelect).toBeVisible();

    const value = await countrySelect.inputValue();
    // Par défaut : CI (iso en minuscules dans phoneCountries)
    expect(value.toLowerCase()).toBe('ci');

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('on peut sélectionner un pays étranger dans PhoneInput', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openSignupForm(page);

    // iso en minuscules dans phoneCountries.ts
    await selectPhoneCountry(page, 'fr');
    const countrySelect = page.locator('select[aria-label="Indicatif pays"]').first();
    await expect(countrySelect).toHaveValue('fr');

    await selectPhoneCountry(page, 'sn');
    await expect(countrySelect).toHaveValue('sn');

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('la soumission d\'un formulaire vide affiche des erreurs de validation', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openSignupForm(page);

    await submitForm(page, /Créer mon compte|S'inscrire|Valider/i);

    // Une erreur doit apparaître (champ requis HTML5 ou message applicatif)
    const errorVisible = await page
      .locator('[class*="error"], [class*="alert"], [role="alert"]')
      .or(page.getByText(/requis|obligatoire|Veuillez|champ/i))
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasRequiredAttr = await page.locator('input[required]:invalid').count();

    expect(errorVisible || hasRequiredAttr > 0).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });

  test('un mot de passe trop court est rejeté', async ({ page }, testInfo) => {
    const diagnostics = collectBrowserDiagnostics(page);

    await openSignupForm(page);

    await page.getByPlaceholder(/[Pp]rénom/i).or(page.getByLabel(/[Pp]rénom/i)).first().fill('Test');
    await page.getByPlaceholder(/[Vv]otre nom|^[Nn]om/i).or(page.getByLabel(/[Nn]om/i)).first().fill('E2E');
    await page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i)).first()
      .fill(`e2e-reject-${Date.now()}@colisdirect.test`);
    await fillPhoneInput(page, '0700000000');
    // Mot de passe de 3 caractères — trop court (minimum 6)
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().fill('abc');
    if (await passwordFields.count() > 1) {
      await passwordFields.nth(1).fill('abc');
    }

    await submitForm(page, /Créer mon compte|S'inscrire|Valider/i);

    const errorVisible = await page
      .locator('[class*="error"], [class*="alert"], [role="alert"]')
      .or(page.getByText(/6 caractères|trop court|minimum|au moins/i))
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(errorVisible).toBeTruthy();

    await expectNoCriticalBrowserIssues(diagnostics, testInfo);
  });
});
