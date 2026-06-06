#!/usr/bin/env node
/**
 * Test API local du flux home_pickup (dispatch + dispatch-status).
 * Usage: node scripts/test-home-pickup-api.mjs [http://localhost:3001/api]
 */
const API = (process.argv[2] || process.env.E2E_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const suffix = Date.now().toString().slice(-6);

const payload = {
  sender_first_name: 'Test',
  sender_last_name: 'Local',
  sender_phone: `0700${suffix}`,
  sender_commune: 'Cocody',
  sender_quartier: 'Riviera',
  sender_address: `Rue test ${suffix}`,
  sender_latitude: 5.378,
  sender_longitude: -3.9822,
  recipient_first_name: 'Dest',
  recipient_last_name: 'Local',
  recipient_phone: `0701${suffix}`,
  recipient_commune: 'Marcory',
  recipient_quartier: 'Zone 4',
  recipient_address: 'Avenue test',
  package_type: 'petit',
  grid_type: 'colis',
  weight: 1,
  price: 0,
  payment_status: 'paid',
  pickup_method: 'home_pickup',
  home_delivery: true,
};

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

async function main() {
  console.log('API:', API);

  const createRes = await fetch(`${API}/shipments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const createText = await createRes.text();
  if (!createRes.ok) fail(`POST /shipments ${createRes.status}: ${createText}`);

  const shipment = JSON.parse(createText);
  console.log('OK création:', shipment.tracking_number, 'pickup_method=', shipment.pickup_method);
  if (shipment.pickup_method !== 'home_pickup') fail('pickup_method attendu: home_pickup');

  const dispatchRes = await fetch(`${API}/tracking/${shipment.tracking_number}/dispatch-status`);
  if (dispatchRes.status === 404) {
    console.warn('SKIP dispatch-status (endpoint non déployé)');
    process.exit(0);
  }
  if (!dispatchRes.ok) fail(`GET dispatch-status ${dispatchRes.status}`);

  const status = await dispatchRes.json();
  console.log('dispatch-status:', status.state);
  if (!['searching', 'assigned', 'no_driver'].includes(status.state)) {
    fail(`état inattendu: ${status.state}`);
  }

  console.log('PASS — flux home_pickup API OK');
}

main().catch((e) => fail(e.message));
