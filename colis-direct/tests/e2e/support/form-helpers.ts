import type { Page } from '@playwright/test';

/**
 * Remplit le composant PhoneInput.
 * PhoneInput rend : <select aria-label="Indicatif pays"> + <input inputMode="numeric">
 * `inputId` = valeur de l'attribut `id` passé au composant (ex: "sender_phone").
 * Si non fourni, cible le premier PhoneInput visible.
 */
export async function fillPhoneInput(
  page: Page,
  phoneNumber: string,
  inputId?: string,
): Promise<void> {
  const input = inputId
    ? page.locator(`input#${inputId}[inputmode="numeric"]`)
    : page.locator('input[inputmode="numeric"]').first();
  await input.fill(phoneNumber);
}

/**
 * Sélectionne un pays dans le PhoneInput via son <select aria-label="Indicatif pays">.
 * `isoCode` ex: "CI", "FR", "SN"
 * `inputId` = id du composant (le select a id="${inputId}-country").
 */
export async function selectPhoneCountry(
  page: Page,
  isoCode: string,
  inputId?: string,
): Promise<void> {
  const select = inputId
    ? page.locator(`select#${inputId}-country`)
    : page.locator('select[aria-label="Indicatif pays"]').first();
  await select.selectOption(isoCode);
}

/**
 * Remplit un champ select natif ou custom par son label visible.
 */
export async function selectOption(page: Page, labelText: string, value: string): Promise<void> {
  const label = page.getByLabel(labelText);
  if ((await label.count()) > 0) {
    await label.selectOption(value);
    return;
  }
  await page.getByText(labelText).locator('..').locator('select').selectOption(value);
}

/**
 * Attend qu'un spinner/loader disparaisse et que le contenu principal soit visible.
 */
export async function waitForPageContent(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  const spinner = page.locator('[data-loading="true"], .animate-spin, [role="progressbar"]');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15_000 });
  }
}

/**
 * Soumet un formulaire et attend la réponse (succès ou erreur visible).
 */
export async function submitForm(page: Page, buttonLabel: RegExp | string): Promise<void> {
  const formButton = page.locator('form').getByRole('button', { name: buttonLabel });
  if (await formButton.count()) {
    await formButton.first().click();
    return;
  }
  await page.getByRole('button', { name: buttonLabel }).first().click();
}
