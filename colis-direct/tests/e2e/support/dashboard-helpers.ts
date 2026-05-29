import { expect, type Page } from '@playwright/test';
import { loginWithEmail } from './auth';
import { waitForPageContent } from './form-helpers';
import { getRoleCredentials, getRoleUserId, type E2ERole, getE2EConfig } from './env';

/** Mapping E2ERole → rôle applicatif réel (utilisé dans le JWT et pour vérifier /auth/me). */
const APP_ROLE: Record<E2ERole, string> = {
  client: 'client',
  admin: 'admin',
  relay: 'relay_partner',
  transporter: 'transporter',
  support: 'support',
};

/**
 * Connecte un rôle et attend que son dashboard soit chargé.
 * Retourne false si les credentials ne sont pas configurés (test skip).
 */
export async function loginAndOpenDashboard(page: Page, role: E2ERole): Promise<boolean> {
  const credentials = getRoleCredentials(role);
  if (!credentials) return false;

  const userId = getRoleUserId(role);
  await loginWithEmail(page, credentials, { id: userId, role: APP_ROLE[role] });
  await waitForPageContent(page);
  return true;
}

/**
 * Vérifie que le backend répond sur un endpoint authentifié.
 */
export async function checkAuthenticatedEndpoint(
  page: Page,
  path: string,
): Promise<{ ok: boolean; status: number }> {
  const e2e = getE2EConfig();
  const token = await page.evaluate(() => window.localStorage.getItem('auth_token'));
  const response = await page.request.get(`${e2e.apiURL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: response.ok(), status: response.status() };
}

/**
 * Attend qu'un tableau de données soit visible et non vide OU affiche un état vide.
 */
export async function waitForTableOrEmpty(page: Page): Promise<'data' | 'empty'> {
  await waitForPageContent(page);

  const tableRow = page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').first();
  const emptyState = page.locator(
    '[data-empty], :text("Aucun"), :text("aucun"), :text("Pas de"), :text("No data"), :text("vide")',
  ).first();

  try {
    await Promise.race([
      tableRow.waitFor({ state: 'visible', timeout: 8_000 }),
      emptyState.waitFor({ state: 'visible', timeout: 8_000 }),
    ]);
  } catch {
    // Timeout acceptable : page chargée mais sans marqueur explicite
  }

  return (await tableRow.count()) > 0 ? 'data' : 'empty';
}

/**
 * Clique sur un onglet de navigation par son texte.
 */
export async function clickTab(page: Page, tabLabel: RegExp | string): Promise<void> {
  await page.getByRole('tab', { name: tabLabel })
    .or(page.getByRole('button', { name: tabLabel }))
    .first()
    .click();
  await waitForPageContent(page);
}

/**
 * Vérifie qu'un en-tête de page ou titre principal est visible.
 */
export async function expectPageHeader(page: Page, heading: RegExp | string): Promise<void> {
  await expect(
    page.getByRole('heading', { name: heading }).or(page.getByText(heading)).first(),
  ).toBeVisible({ timeout: 12_000 });
}
