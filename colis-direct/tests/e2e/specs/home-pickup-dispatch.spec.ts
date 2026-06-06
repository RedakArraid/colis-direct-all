import { expect, test } from '@playwright/test';
import { loginWithEmail } from '../support/auth';
import {
  createPaidHomePickupShipment,
  getTransporterApiToken,
  waitForDispatchSearching,
} from '../support/dispatch-helpers';
import { getE2EConfig, getRoleCredentials, getRoleUserId } from '../support/env';

const e2e = getE2EConfig();

test.describe('Dispatch ramassage à domicile (home_pickup)', () => {
  test('API — création payée home_pickup', async ({ request }) => {
    const shipment = await createPaidHomePickupShipment(request);

    const trackRes = await request.get(`${e2e.apiURL}/tracking/${shipment.tracking_number}`);
    expect(trackRes.ok(), await trackRes.text()).toBeTruthy();

    const status = await waitForDispatchSearching(request, shipment.tracking_number);
    if (status) {
      expect(['searching', 'assigned', 'no_driver']).toContain(status.state);
      if (status.state === 'searching' && status.pickup) {
        expect(status.pickup.latitude).toBeTruthy();
        expect(status.pickup.longitude).toBeTruthy();
      }
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'Endpoint /dispatch-status absent sur cet environnement (déployer la branche dev)',
      });
    }
  });

  test('API — transporteur accède aux offres marketplace', async ({ request }) => {
    const transporterCreds = getRoleCredentials('transporter');
    test.skip(!transporterCreds, 'Renseigner E2E_TRANSPORTER_EMAIL et E2E_TRANSPORTER_PASSWORD.');

    await createPaidHomePickupShipment(request);
    const token = await getTransporterApiToken(request);

    const offersRes = await request.get(`${e2e.apiURL}/delivery-offers/my-offers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(offersRes.ok(), await offersRes.text()).toBeTruthy();
    const offers = await offersRes.json();

    expect(Array.isArray(offers)).toBeTruthy();
    const homeOffers = (offers as any[]).filter((o) => o.pickup_method === 'home_pickup');
    if (homeOffers.length > 0) {
      expect(homeOffers[0].sender_address).toBeTruthy();
    }
  });

  test('UI — espace transporteur affiche les offres', async ({ page, browserName }) => {
    test.skip(process.env.PLAYWRIGHT_SKIP_UI === '1', 'UI désactivé (PLAYWRIGHT_SKIP_UI=1).');
    const transporterCreds = getRoleCredentials('transporter');
    test.skip(!transporterCreds, 'Renseigner E2E_TRANSPORTER_EMAIL et E2E_TRANSPORTER_PASSWORD.');
    test.skip(!browserName, 'Navigateur Playwright indisponible — lancer: npx playwright install chromium');

    const authMode = process.env.E2E_AUTH_MODE || 'api';
    const jwtIdentity =
      authMode === 'jwt'
        ? { id: getRoleUserId('transporter'), role: 'transporter' }
        : undefined;
    await loginWithEmail(page, transporterCreds!, jwtIdentity);

    await expect(page.getByText(/Offres disponibles|Courses disponibles|Tableau de bord/i).first()).toBeVisible({ timeout: 12_000 });

    const coursesTab = page.getByRole('button', { name: /Courses/i });
    if (await coursesTab.isVisible().catch(() => false)) {
      await coursesTab.click();
    }

    await expect(page.getByText(/Offres disponibles|Aucune course disponible|Ramassage à domicile/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
