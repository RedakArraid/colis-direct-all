import { expect, type Page } from '@playwright/test';

export async function prepareCleanVisitorContext(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('colisdirect:last-page');
    window.localStorage.removeItem('trackingNumber');
    window.sessionStorage.clear();
  });
}

export async function openHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('navigation').getByRole('button', { name: /Envoyer un colis/i }),
  ).toBeVisible();
}

export async function navigateWithHeader(page: Page, label: RegExp | string) {
  await page.getByRole('navigation').getByRole('button', { name: label }).first().click();
}

/**
 * Connecte un compte client standard via le formulaire de login de la homepage.
 * Après connexion, l'app redirige automatiquement selon le rôle.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Cliquer sur le bouton Connexion dans la navbar
  await page.getByRole('button', { name: /Se connecter/i }).first().click();
  await page.getByLabel(/E-mail|email/i).fill(email);
  await page.getByLabel(/Mot de passe|password/i).fill(password);
  await page.getByRole('button', { name: /Se connecter/i }).click();
}

/**
 * Connecte le compte relay partenaire.
 * IMPORTANT : utilise le même formulaire de login que les clients (homepage).
 * Après connexion, l'app redirige AUTOMATIQUEMENT vers le dashboard relais
 * (App.tsx ligne 171 : setCurrentPage('relay-dashboard') si page courante = home|login).
 * Ne pas naviguer manuellement — attendre la redirection.
 */
export async function loginAsRelay(page: Page, email: string, password: string) {
  await loginAs(page, email, password);
  // Attendre la redirection automatique vers le dashboard relais
  await expect(page.getByText(/Tableau de bord relais|Dashboard relais/i)).toBeVisible({ timeout: 8000 });
}

/**
 * Connecte le compte transporteur.
 * IMPORTANT : les transporteurs ont un parcours de login DÉDIÉ.
 * L'app affiche TransporterLoginPage (code PIN) pour tout utilisateur role=transporter
 * AVANT même la page home. Ne pas utiliser le bouton "Connexion" standard.
 *
 * Flux correct :
 * 1. Aller sur / avec un localStorage vide (prepareCleanVisitorContext)
 * 2. L'API auth renvoie role=transporter → App redirige vers transporter-login
 * 3. Saisir le code PIN du transporteur sur la page dédiée
 *
 * Alternative via API auth directe (recommandée pour les tests) :
 * - Utiliser E2E_AUTH_MODE=jwt avec E2E_TRANSPORTER_USER_ID pour injecter le token
 *   directement sans passer par le formulaire PIN.
 */
export async function loginAsTransporter(page: Page, email: string, password: string) {
  await loginAs(page, email, password);
  // L'app redirige automatiquement vers le composant TransporterLoginPage
  // qui s'affiche comme overlay — pas de navigation manuelle nécessaire
  await expect(page.getByText(/Transporteur|Tournée|Ramassage/i)).toBeVisible({ timeout: 8000 });
}
