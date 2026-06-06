import { expect, type APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import { getE2EConfig, getRoleCredentials, getRoleUserId } from './env';
import { getCachedAuth, cacheAuthEntry } from './token-cache';
import { getE2EBypassHeaders } from './e2e-headers';

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Token transporteur sans navigateur (JWT E2E ou signin API). */
export async function getTransporterApiToken(request: APIRequestContext): Promise<string> {
  const creds = getRoleCredentials('transporter');
  if (!creds) throw new Error('E2E_TRANSPORTER_EMAIL/PASSWORD manquants');

  const cached = getCachedAuth(creds.email);
  if (cached?.token) return cached.token;

  const authMode = process.env.E2E_AUTH_MODE || 'api';
  if (authMode === 'jwt') {
    const secret = process.env.E2E_JWT_SECRET;
    if (!secret) throw new Error('E2E_JWT_SECRET requis');
    const payload = {
      id: getRoleUserId('transporter'),
      email: creds.email,
      role: 'transporter',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };
    const unsigned = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(payload))}`;
    const sig = base64Url(crypto.createHmac('sha256', secret).update(unsigned).digest());
    return `${unsigned}.${sig}`;
  }

  const { apiURL } = getE2EConfig();
  const res = await request.post(`${apiURL}/auth/signin`, {
    data: { email: creds.email, password: creds.password },
    headers: {
      'x-forwarded-for': `10.${Math.floor(Math.random() * 200)}.1.1`,
      ...getE2EBypassHeaders(),
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  cacheAuthEntry(creds.email, { token: body.token, refresh_token: body.refresh_token });
  return body.token as string;
}

export interface HomePickupShipment {
  id: string;
  tracking_number: string;
}

/** Crée un colis home_pickup déjà payé (dispatch immédiat côté API). */
export async function createPaidHomePickupShipment(
  request: APIRequestContext,
  token?: string,
): Promise<HomePickupShipment> {
  const { apiURL } = getE2EConfig();
  const suffix = Date.now().toString().slice(-6);

  const payload = {
    sender_first_name: 'E2E',
    sender_last_name: 'Dispatch',
    sender_phone: `0700${suffix}`,
    sender_commune: 'Cocody',
    sender_quartier: 'Riviera',
    sender_address: `Rue test dispatch ${suffix}`,
    sender_latitude: 5.378,
    sender_longitude: -3.9822,
    recipient_first_name: 'Dest',
    recipient_last_name: 'Test',
    recipient_phone: `0701${suffix}`,
    recipient_commune: 'Marcory',
    recipient_quartier: 'Zone 4',
    recipient_address: 'Avenue test E2E',
    package_type: 'petit',
    grid_type: 'colis',
    weight: 1,
    price: 0,
    payment_status: 'paid',
    pickup_method: 'home_pickup',
    home_delivery: true,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await request.post(`${apiURL}/shipments`, { headers, data: payload });
  expect(res.ok(), `Création colis E2E: ${res.status()} ${await res.text()}`).toBeTruthy();
  const shipment = await res.json();
  expect(shipment.tracking_number).toBeTruthy();
  return { id: shipment.id, tracking_number: shipment.tracking_number };
}

export async function isDispatchStatusAvailable(request: APIRequestContext, trackingNumber: string) {
  const { apiURL } = getE2EConfig();
  const res = await request.get(`${apiURL}/tracking/${trackingNumber}/dispatch-status`);
  return res.status() !== 404;
}

export async function waitForDispatchSearching(
  request: APIRequestContext,
  trackingNumber: string,
  timeoutMs = 20_000,
) {
  const { apiURL } = getE2EConfig();
  const probe = await request.get(`${apiURL}/tracking/${trackingNumber}/dispatch-status`);
  if (probe.status() === 404) {
    return null;
  }

  const deadline = Date.now() + timeoutMs;
  let lastState = '';

  while (Date.now() < deadline) {
    const res = await request.get(`${apiURL}/tracking/${trackingNumber}/dispatch-status`);
    if (res.ok()) {
      const body = await res.json();
      lastState = body.state;
      if (['searching', 'assigned', 'no_driver'].includes(body.state)) {
        return body;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error(`dispatch-status timeout (dernier état: ${lastState || 'inconnu'})`);
}
