#!/usr/bin/env node
/**
 * Test E2E domicile→domicile (staging/local) :
 * - création colis (paystack pending + relay_cash)
 * - dispatch / attente transporteur
 * - offres transporteur + acceptation
 */
const API = (process.env.E2E_API_URL || 'https://staging-api.colisdirect.com/api').replace(/\/$/, '');
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'e2e+client@colisdirect.test';
const TRANSPORTER_EMAIL = process.env.E2E_TRANSPORTER_EMAIL || 'e2e+transporter@colisdirect.test';
const PASSWORD = process.env.E2E_PASSWORD || process.env.E2E_CLIENT_PASSWORD || 'admin123';

const suffix = Date.now().toString().slice(-6);
const results = [];

function log(step, ok, detail = '') {
  const status = ok ? '✅' : '❌';
  const line = `${status} ${step}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  results.push({ step, ok, detail });
}

function fail(msg) {
  log(msg, false);
  summarize(false);
  process.exit(1);
}

function summarize(exitOk = true) {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log('\n─── Résumé ───');
  console.log(`Passés: ${passed} | Échoués: ${failed}`);
  if (!exitOk || failed > 0) process.exit(1);
}

async function signin(email) {
  const res = await fetch(`${API}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`signin ${email}: ${res.status} ${text}`);
  return JSON.parse(text);
}

function basePayload(overrides = {}) {
  return {
    sender_first_name: 'E2E',
    sender_last_name: 'Browser',
    sender_email: CLIENT_EMAIL,
    sender_phone: `0700${suffix}`,
    sender_commune: 'Cocody',
    sender_quartier: 'Riviera',
    sender_address: `Rue E2E ${suffix}`,
    sender_latitude: 5.378,
    sender_longitude: -3.9822,
    recipient_first_name: 'Dest',
    recipient_last_name: 'Domicile',
    recipient_phone: `0701${suffix}`,
    recipient_commune: 'Cocody',
    recipient_quartier: 'Angré',
    recipient_address: `Avenue E2E ${suffix}`,
    package_type: 'petit',
    grid_type: 'colis',
    weight: 1,
    home_delivery: true,
    pickup_method: 'home_pickup',
    origin_relay_id: null,
    destination_relay_id: null,
    ...overrides,
  };
}

async function createShipment(token, overrides) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/shipments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(basePayload(overrides)),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST /shipments ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function getDispatchStatus(trackingNumber) {
  const res = await fetch(`${API}/tracking/${trackingNumber}/dispatch-status`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`dispatch-status ${res.status}`);
  return res.json();
}

async function waitDispatch(trackingNumber, expectedStates, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await getDispatchStatus(trackingNumber);
    if (!last) return null;
    if (expectedStates.includes(last.state)) return last;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`timeout dispatch (dernier: ${last?.state})`);
}

async function getOffers(token) {
  const res = await fetch(`${API}/delivery-offers/my-offers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`my-offers ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function acceptOffer(token, offerId) {
  const res = await fetch(`${API}/delivery-offers/${offerId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function getTracking(trackingNumber) {
  const res = await fetch(`${API}/tracking/${trackingNumber}`);
  if (!res.ok) throw new Error(`tracking ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`\n🧪 Test E2E domicile→domicile — ${API}\n`);

  // ── 1. Auth ──
  let clientAuth, transporterAuth;
  try {
    clientAuth = await signin(CLIENT_EMAIL);
    log('Connexion client E2E', true, CLIENT_EMAIL);
    transporterAuth = await signin(TRANSPORTER_EMAIL);
    log('Connexion transporteur E2E', true, TRANSPORTER_EMAIL);
  } catch (e) {
    fail(`Authentification: ${e.message}`);
  }

  // ── 2. Paystack pending : dispatch différé ──
  try {
    const unpaid = await createShipment(clientAuth.token, {
      price: 2500,
      payment_status: 'pending',
      payment_method: 'paystack',
    });
    log('Création colis domicile→domicile (Paystack pending)', true, unpaid.tracking_number);

    const statusUnpaid = await getDispatchStatus(unpaid.tracking_number);
    if (!statusUnpaid) {
      log('dispatch-status endpoint', false, '404 — non déployé');
    } else {
      const offersRes = await fetch(`${API}/delivery-offers/my-offers`, {
        headers: { Authorization: `Bearer ${transporterAuth.token}` },
      });
      const offers = offersRes.ok ? await offersRes.json() : [];
      const hasUnpaidOffer = offers.some((o) => o.tracking_number === unpaid.tracking_number);
      log(
        'Dispatch différé avant paiement Paystack',
        !hasUnpaidOffer,
        hasUnpaidOffer
          ? 'ERREUR: offre envoyée avant paiement'
          : `état=${statusUnpaid.state}, aucune offre transporteur`,
      );
    }

    const initRes = await fetch(`${API}/payments/paystack/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracking_number: unpaid.tracking_number,
        amount_fcfa: 2500,
        customer_name: 'E2E Browser',
        customer_email: CLIENT_EMAIL,
        customer_phone: `0700${suffix}`,
      }),
    });
    const initText = await initRes.text();
    if (initRes.ok) {
      const initData = JSON.parse(initText);
      const payUrl =
        initData.payment_url ||
        initData.authorization_url ||
        initData.data?.authorization_url;
      log('Initialisation paiement Paystack', !!payUrl, payUrl || 'pas d\'URL');
    } else {
      log('Initialisation paiement Paystack', false, `${initRes.status}: ${initText.slice(0, 120)}`);
    }
  } catch (e) {
    log('Flux Paystack pending', false, e.message);
  }

  // ── 3. relay_cash : dispatch immédiat + attente transporteur ──
  let cashShipment;
  try {
    cashShipment = await createShipment(clientAuth.token, {
      price: 2500,
      payment_status: 'pending',
      payment_method: 'relay_cash',
    });
    log('Création colis domicile→domicile (espèces au ramassage)', true, cashShipment.tracking_number);

    const tracking = await getTracking(cashShipment.tracking_number);
    log(
      'Statut client = attente ramassage',
      ['PICKUP_PENDING', 'READY_FOR_DROP_OFF'].includes(tracking.current_status),
      `current_status=${tracking.current_status}`,
    );

    const dispatch = await waitDispatch(cashShipment.tracking_number, ['searching', 'assigned', 'no_driver']);
    if (!dispatch) {
      log('Recherche transporteur (dispatch-status)', false, 'endpoint absent');
    } else {
      log('Recherche transporteur lancée', ['searching', 'assigned'].includes(dispatch.state), `state=${dispatch.state}`);
    }
  } catch (e) {
    log('Flux relay_cash + dispatch', false, e.message);
    summarize(false);
    return;
  }

  // ── 4. Transporteur reçoit l'offre ──
  let targetOffer;
  try {
    await new Promise((r) => setTimeout(r, 2000));
    const offers = await getOffers(transporterAuth.token);
    const homeOffers = offers.filter((o) => o.pickup_method === 'home_pickup');
    targetOffer = homeOffers.find((o) => o.tracking_number === cashShipment.tracking_number);
    log(
      'Notification offre transporteur',
      !!targetOffer,
      targetOffer
        ? `${homeOffers.length} offre(s) home_pickup, cible trouvée`
        : `${homeOffers.length} offre(s) home_pickup, tracking ${cashShipment.tracking_number} absent`,
    );
  } catch (e) {
    log('Lecture offres transporteur', false, e.message);
    summarize(false);
    return;
  }

  // ── 5. Acceptation course ──
  if (targetOffer) {
    try {
      const accept = await acceptOffer(transporterAuth.token, targetOffer.id);
      log('Acceptation course par transporteur', accept.ok, accept.ok ? 'OK' : accept.body);
      if (accept.ok) {
        const assigned = await waitDispatch(cashShipment.tracking_number, ['assigned'], 10000);
        log(
          'Client voit livreur assigné',
          assigned?.state === 'assigned',
          assigned?.driver
            ? `${assigned.driver.first_name} ${assigned.driver.last_name}`
            : `state=${assigned?.state}`,
        );
        const afterTracking = await getTracking(cashShipment.tracking_number);
        log(
          'Colis lié au transporteur en base',
          !!afterTracking.transporter_id,
          `transporter_id=${afterTracking.transporter_id || 'null'}`,
        );
      }
    } catch (e) {
      log('Acceptation course', false, e.message);
    }
  }

  // ── 6. Paiement payé immédiat (simule callback Paystack réussi) ──
  try {
    const paid = await createShipment(clientAuth.token, {
      price: 2500,
      payment_status: 'paid',
      payment_method: 'paystack',
    });
    log('Création colis payé (post-Paystack)', true, paid.tracking_number);
    const dispatchPaid = await waitDispatch(paid.tracking_number, ['searching', 'assigned', 'no_driver'], 15000);
    log(
      'Dispatch après paiement confirmé',
      dispatchPaid && ['searching', 'assigned'].includes(dispatchPaid.state),
      dispatchPaid ? `state=${dispatchPaid.state}` : 'endpoint absent',
    );
  } catch (e) {
    log('Flux paiement confirmé + dispatch', false, e.message);
  }

  summarize();
}

main().catch((e) => fail(e.message));
