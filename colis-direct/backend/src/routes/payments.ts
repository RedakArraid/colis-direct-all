import express from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { pool } from '../db/connection';
import dispatchService from '../services/dispatchService';
import { resolvePaymentEmail } from '../utils/paymentEmail';
const router = express.Router();
export const paymentsWebhookRouter = express.Router();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return 0;
};

const getRelayPointIdForUser = async (userId: string): Promise<string | null> => {
  const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [userId]);
  const relayId = relayResult.rows[0]?.relay_point_id;
  return relayId ? String(relayId) : null;
};

const shipmentRowAmountFcfa = (row: any): number =>
  toNumber(row?.price) + toNumber(row?.printing_fee) + toNumber(row?.assistance_fee) + toNumber(row?.box_price);

// Montant total attendu (en kobo) pour une liste de colis, recalculé depuis la DB.
// Source de vérité serveur : ne jamais faire confiance au montant envoyé par le client.
async function getExpectedAmountKobo(trackingNumbers: string[]): Promise<{ kobo: number; found: string[] }> {
  if (!trackingNumbers.length) return { kobo: 0, found: [] };
  const placeholders = trackingNumbers.map((_, i) => `$${i + 1}`).join(', ');
  const r = await pool.query(
    `SELECT tracking_number, price, printing_fee, assistance_fee, box_price
     FROM shipments WHERE tracking_number IN (${placeholders})`,
    trackingNumbers
  );
  const totalFcfa = r.rows.reduce((s: number, row: any) => s + shipmentRowAmountFcfa(row), 0);
  return { kobo: Math.round(totalFcfa * 100), found: r.rows.map((row: any) => String(row.tracking_number)) };
}

// Le montant payé (kobo, fourni par le provider) doit couvrir le montant attendu.
const amountCovers = (paidKobo: number, expectedKobo: number): boolean =>
  Number.isFinite(paidKobo) && expectedKobo > 0 && paidKobo >= expectedKobo;

// Après confirmation de paiement, lance la recherche de livreur (style Uber)
// pour les colis en ramassage à domicile. dispatchShipment ignore les non-home_pickup
// et est idempotent (garde contre une offre déjà active). Fire-and-forget : un échec
// de dispatch ne doit jamais faire échouer la confirmation de paiement.
async function dispatchHomePickups(trackingNumbers: string[]): Promise<void> {
  if (!trackingNumbers.length) return;
  const placeholders = trackingNumbers.map((_, i) => `$${i + 1}`).join(', ');
  const r = await pool.query(
    `SELECT id FROM shipments WHERE tracking_number IN (${placeholders}) AND pickup_method = 'home_pickup'`,
    trackingNumbers
  );
  for (const row of r.rows) {
    dispatchService.dispatchShipment(String(row.id)).catch((err: any) =>
      console.error(`[Dispatch] échec dispatch colis ${row.id}:`, err?.message)
    );
  }
}

// Paystack Webhook (mounted before JSON parser — raw body needed for signature)
paymentsWebhookRouter.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['x-paystack-signature'] as string;
  if (!sig || !PAYSTACK_SECRET_KEY) {
    return res.status(400).send('Webhook non configuré ou signature manquante');
  }

  const expected = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');

  if (expected !== sig) {
    console.warn('[Paystack] Invalid webhook signature');
    return res.status(401).send('Signature invalide');
  }

  try {
    const event = JSON.parse(req.body.toString());
    if (event.event === 'charge.success') {
      const ref = event.data?.reference;
      const trackingNumber = event.data?.metadata?.tracking_number;
      const batchRef = event.data?.metadata?.batch_ref;
      const paidKobo = toNumber(event.data?.amount);

      await pool.query(
        `UPDATE automated_payments
         SET status = 'confirmed', webhook_received_at = NOW(), raw_response = raw_response || $1::jsonb, updated_at = NOW()
         WHERE transaction_id = $2`,
        [JSON.stringify(event.data), ref]
      );

      // Gérer le cas batch : détection via metadata.batch_ref (ref Paystack = PS-xxx, pas BATCH-xxx)
      if (batchRef) {
        // Les tracking_numbers sont dans raw_response (fusionné lors de l'init)
        const batchResult = await pool.query(
          `SELECT raw_response FROM automated_payments WHERE transaction_id = $1`,
          [ref]
        );
        if (batchResult.rows.length > 0) {
          let trackingNumbers: string[] = [];
          try {
            const raw = batchResult.rows[0].raw_response;
            const batchData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(batchData?.tracking_numbers)) {
              trackingNumbers = batchData.tracking_numbers;
            }
          } catch (parseErr: any) {
            console.error('[Paystack] Batch raw_response parse error:', parseErr.message);
          }
          if (trackingNumbers.length > 0) {
            const { kobo: expectedKobo } = await getExpectedAmountKobo(trackingNumbers);
            if (!amountCovers(paidKobo, expectedKobo)) {
              console.error(`[Paystack] Batch amount mismatch — paid=${paidKobo} expected=${expectedKobo} (ref: ${ref}); shipments NOT marked paid: ${trackingNumbers.join(', ')}`);
            } else {
              const placeholders = trackingNumbers.map((_: string, i: number) => `$${i + 1}`).join(', ');
              await pool.query(
                `UPDATE shipments SET payment_status = 'paid', payment_method = 'paystack', updated_at = NOW()
                 WHERE tracking_number IN (${placeholders}) AND payment_status = 'pending'`,
                trackingNumbers
              );
              for (const tn of trackingNumbers) {
                await pool.query(
                  `INSERT INTO shipment_tracking (shipment_id, status, notes, created_at)
                   SELECT id, 'PAYMENT_CONFIRMED', 'Paiement batch confirmé via Paystack (ref: ' || $2 || ')', NOW()
                   FROM shipments WHERE tracking_number = $1`,
                  [tn, ref]
                );
              }
              console.info(`[Paystack] Batch payment confirmed: ${trackingNumbers.join(', ')} (ref: ${ref})`);
              await dispatchHomePickups(trackingNumbers);
            }
          }
        }
      } else if (trackingNumber && !trackingNumber.startsWith('BATCH-')) {
        const { kobo: expectedKobo } = await getExpectedAmountKobo([trackingNumber]);
        if (!amountCovers(paidKobo, expectedKobo)) {
          console.error(`[Paystack] Amount mismatch — paid=${paidKobo} expected=${expectedKobo} for ${trackingNumber} (ref: ${ref}); shipment NOT marked paid`);
        } else {
          await pool.query(
            `UPDATE shipments SET payment_status = 'paid', payment_method = 'paystack', updated_at = NOW()
             WHERE tracking_number = $1 AND payment_status = 'pending'`,
            [trackingNumber]
          );
          await pool.query(
            `INSERT INTO shipment_tracking (shipment_id, status, notes, created_at)
             SELECT id, 'PAYMENT_CONFIRMED', 'Paiement confirmé via Paystack (ref: ' || $2 || ')', NOW()
             FROM shipments WHERE tracking_number = $1`,
            [trackingNumber, ref]
          );
          console.info(`[Paystack] Payment confirmed: ${trackingNumber} (ref: ${ref})`);
          await dispatchHomePickups([trackingNumber]);
        }
      }
    }
  } catch (err: any) {
    console.error('[Paystack] Webhook handling error:', err.message);
    return res.status(500).send('Erreur traitement webhook');
  }

  res.json({ received: true });
});


router.post('/relay-cash/confirm', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { tracking_number, amount, notes } = req.body || {};
    if (!tracking_number) {
      return res.status(400).json({ error: 'tracking_number est requis' });
    }

    const relayPointId = await getRelayPointIdForUser(req.user!.id);
    if (!relayPointId) {
      return res.status(403).json({ error: 'Votre compte relais n\'est pas associé à un point relais.' });
    }

    const normalizedTracking = String(tracking_number).trim().toUpperCase();

    await client.query('BEGIN');

    // Lock only the shipment row to avoid FOR UPDATE on the nullable side of an outer join
    const shipmentResult = await client.query(
      `SELECT s.id,
              s.payment_method,
              s.payment_status,
              s.origin_relay_id,
              s.pickup_method,
              s.price,
              s.printing_fee,
              s.assistance_fee,
              s.box_price
       FROM shipments s
       WHERE s.tracking_number = $1
       FOR UPDATE`,
      [normalizedTracking]
    );

    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];

    // Load relay cash payment separately (no lock needed on nullable side)
    const relayPaymentResult = await client.query(
      `SELECT id AS relay_cash_payment_id,
              status AS relay_cash_status,
              amount_expected,
              amount_collected,
              relay_point_id
       FROM relay_cash_payments
       WHERE shipment_id = $1`,
      [shipment.id]
    );
    const relayPayment = relayPaymentResult.rows[0] || null;

    if ((shipment.payment_method || '').toLowerCase() !== 'relay_cash') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce colis n\'est pas associé au paiement en point relais.' });
    }

    if (shipment.pickup_method === 'home_pickup') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce colis est en mode ramassage à domicile. Le paiement en espèces est collecté par le transporteur lors du ramassage.' });
    }

    if (shipment.origin_relay_id && String(shipment.origin_relay_id) !== relayPointId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Ce colis n\'est pas enregistré pour votre point relais.' });
    }

    if ((shipment.payment_status || '').toLowerCase() === 'paid' && (relayPayment?.relay_cash_status || '').toLowerCase() === 'collected') {
      await client.query('COMMIT');
      return res.json({ status: 'already_collected' });
    }

    const expectedAmount =
      toNumber(relayPayment?.amount_expected) ||
      toNumber(shipment.price) + toNumber(shipment.printing_fee) + toNumber(shipment.assistance_fee) + toNumber(shipment.box_price);
    const collectedAmount =
      amount !== undefined && amount !== null && amount !== ''
        ? toNumber(amount)
        : expectedAmount;

    await client.query(
      `INSERT INTO relay_cash_payments (
         shipment_id,
         relay_point_id,
         amount_expected,
         amount_collected,
         status,
         collected_by,
         collected_at,
         notes,
         collection_location
       )
       VALUES ($1, $2, $3, $4, 'collected', $5, NOW(), $6, 'relay')
       ON CONFLICT (shipment_id) DO UPDATE SET
         relay_point_id = COALESCE(EXCLUDED.relay_point_id, relay_cash_payments.relay_point_id),
         amount_expected = COALESCE(relay_cash_payments.amount_expected, EXCLUDED.amount_expected),
         amount_collected = EXCLUDED.amount_collected,
         status = 'collected',
         collected_by = EXCLUDED.collected_by,
         collected_at = NOW(),
         notes = COALESCE(EXCLUDED.notes, relay_cash_payments.notes),
         collection_location = COALESCE(relay_cash_payments.collection_location, 'relay'),
         updated_at = NOW()
       RETURNING *`,
      [
        shipment.id,
        shipment.origin_relay_id || relayPointId,
        expectedAmount,
        collectedAmount,
        req.user!.id,
        notes ? String(notes).trim() : null,
      ]
    );

    // Update payment status but keep current_status unchanged
    // The effective status will be calculated by the frontend based on payment_status and payment_method
    // This allows the shipment to be received after payment confirmation
    await client.query(
      `UPDATE shipments
       SET payment_status = 'paid',
           payment_method = 'relay_cash',
           updated_at = NOW(),
           updated_by = $2
       WHERE id = $1`,
      [shipment.id, req.user!.id]
    );

    await client.query(
      `INSERT INTO shipment_tracking (shipment_id, status, notes, updated_by, created_at)
       VALUES ($1, 'PAYMENT_RECEIVED_AT_RELAY', 'Paiement encaissé au point relais', $2, NOW())`,
      [shipment.id, req.user!.id]
    );

    if (shipment.origin_relay_id) {
      await client.query('SELECT refresh_relay_daily_metrics($1, CURRENT_DATE)', [shipment.origin_relay_id]);
    }

    await client.query('COMMIT');
    res.json({ status: 'collected' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Relay cash confirm error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.get('/relay-cash/dashboard', authenticate, requireRole('support', 'support_supervisor', 'admin'), async (_req: AuthRequest, res) => {
  try {
    const pendingResult = await pool.query(
      `SELECT rcp.*,
              s.tracking_number,
              s.sender_first_name,
              s.sender_last_name,
              s.recipient_first_name,
              s.recipient_last_name,
              s.price,
              s.printing_fee,
              s.assistance_fee,
              s.box_price,
              rp.name AS relay_name
       FROM relay_cash_payments rcp
       JOIN shipments s ON s.id = rcp.shipment_id
       LEFT JOIN relay_points rp ON rcp.relay_point_id = rp.id
       WHERE rcp.status = 'pending'
       ORDER BY rcp.created_at ASC`
    );

    const collectedResult = await pool.query(
      `SELECT rcp.*,
              s.tracking_number,
              s.sender_first_name,
              s.sender_last_name,
              s.recipient_first_name,
              s.recipient_last_name,
              rp.name AS relay_name,
              u.first_name AS collected_by_first_name,
              u.last_name AS collected_by_last_name,
              u.email AS collected_by_email
       FROM relay_cash_payments rcp
       JOIN shipments s ON s.id = rcp.shipment_id
       LEFT JOIN relay_points rp ON rcp.relay_point_id = rp.id
       LEFT JOIN users u ON rcp.collected_by = u.id
       WHERE rcp.status = 'collected'
       ORDER BY rcp.collected_at DESC
       LIMIT 100`
    );

    const summaryResult = await pool.query(
      `SELECT
         rp.id AS relay_point_id,
         COALESCE(rp.name, 'Relais non défini') AS relay_name,
         COUNT(*) FILTER (WHERE rcp.status = 'pending')::int AS pending_count,
         COUNT(*) FILTER (WHERE rcp.status = 'collected')::int AS collected_count,
         COALESCE(SUM(rcp.amount_expected) FILTER (WHERE rcp.status = 'pending'), 0) AS pending_amount,
         COALESCE(SUM(rcp.amount_collected) FILTER (WHERE rcp.status = 'collected'), 0) AS collected_amount
       FROM relay_cash_payments rcp
       LEFT JOIN relay_points rp ON rcp.relay_point_id = rp.id
       GROUP BY rp.id, rp.name
       ORDER BY relay_name`
    );

    res.json({
      pending: pendingResult.rows,
      collected: collectedResult.rows,
      summary: {
        byRelay: summaryResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Relay cash dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/relay-cash/summary', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const totalsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'collected')::int AS collected_count,
         COALESCE(SUM(amount_collected) FILTER (WHERE status = 'collected'), 0) AS collected_amount,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COALESCE(SUM(amount_expected) FILTER (WHERE status = 'pending'), 0) AS pending_amount
       FROM relay_cash_payments`
    );

    const byRelay = await pool.query(
      `SELECT
         rp.id AS relay_point_id,
         COALESCE(rp.name, 'Relais non défini') AS relay_name,
         COUNT(*) FILTER (WHERE rcp.status = 'collected')::int AS collected_count,
         COALESCE(SUM(rcp.amount_collected) FILTER (WHERE rcp.status = 'collected'), 0) AS collected_amount,
         COUNT(*) FILTER (WHERE rcp.status = 'pending')::int AS pending_count,
         COALESCE(SUM(rcp.amount_expected) FILTER (WHERE rcp.status = 'pending'), 0) AS pending_amount
       FROM relay_cash_payments rcp
       LEFT JOIN relay_points rp ON rcp.relay_point_id = rp.id
       GROUP BY rp.id, rp.name
       ORDER BY relay_name`
    );

    res.json({
      totals: totalsResult.rows[0] || {},
      byRelay: byRelay.rows,
    });
  } catch (error: any) {
    console.error('Relay cash summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Helpers providers ────────────────────────────────────────────────────────

type InitPayload = {
  tracking_number: string;
  amount_fcfa: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

async function initPaystack(payload: InitPayload, res: express.Response, batch_ref?: string) {
  const { tracking_number, amount_fcfa, customer_name, customer_email, customer_phone } = payload;
  const secretKey = PAYSTACK_SECRET_KEY;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!secretKey) {
    return res.status(503).json({ error: 'PAYSTACK_NOT_CONFIGURED — renseignez PAYSTACK_SECRET_KEY dans le .env' });
  }

  const resolvedEmail = resolvePaymentEmail(customer_email);


  const reference = `PS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const psPayload = {
    email: resolvedEmail,
    amount: Math.round(amount_fcfa * 100),
    currency: 'XOF',
    reference,
    callback_url: `${frontendUrl}/#/payment-success?tracking=${tracking_number}`,
    metadata: {
      tracking_number,
      batch_ref: batch_ref || null,   // permet au webhook de retrouver le batch
      customer_name,
      customer_phone,
    },
  };

  const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
    body: JSON.stringify(psPayload),
  });
  const psData: any = await psRes.json();
  if (!psRes.ok || !psData?.data?.authorization_url) {
    console.error('[Paystack] init error:', psData);
    return res.status(502).json({ error: psData?.message || 'Erreur lors de l\'initialisation du paiement' });
  }

  // Pour un batch, on enregistre le batch_ref comme transaction_id dans automated_payments
  // (la ligne batch_pending a déjà été insérée avec transaction_id = batch_ref dans init-batch)
  // Ici on met à jour cette ligne avec la vraie référence Paystack.
  // On FUSIONNE raw_response (||) pour préserver les tracking_numbers du batch original.
  if (batch_ref) {
    await pool.query(
      `UPDATE automated_payments SET transaction_id = $1, payment_url = $2, raw_response = raw_response || $3::jsonb, updated_at = NOW()
       WHERE transaction_id = $4`,
      [reference, psData.data.authorization_url, JSON.stringify(psData.data), batch_ref]
    );
  } else {
    await pool.query(
      `INSERT INTO automated_payments (tracking_number, provider, transaction_id, amount, payment_url, raw_response)
       VALUES ($1, 'paystack', $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [tracking_number, reference, amount_fcfa, psData.data.authorization_url, JSON.stringify(psData.data)]
    );
  }
  return res.json({ payment_url: psData.data.authorization_url, transaction_id: reference });
}

async function initCinetpay(payload: InitPayload, res: express.Response, batch_ref?: string) {
  const { tracking_number, amount_fcfa, customer_name, customer_email, customer_phone } = payload;
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  if (!apiKey || !siteId) {
    return res.status(503).json({ error: 'CINETPAY_NOT_CONFIGURED — renseignez CINETPAY_API_KEY et CINETPAY_SITE_ID' });
  }

  const resolvedEmailCp = resolvePaymentEmail(customer_email);

  const transactionId = `CP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const cpPayload = {
    apikey: apiKey, site_id: siteId, transaction_id: transactionId,
    amount: amount_fcfa, currency: 'XOF',
    description: `Colis Direct - ${tracking_number}`,
    notify_url: `${backendUrl}/api/payments/cinetpay/notify`,
    return_url: `${frontendUrl}/#/payment-success?tracking=${tracking_number}`,
    channels: 'ALL', customer_name, customer_email: resolvedEmailCp,
    customer_phone_number: customer_phone, customer_country: 'CI', customer_state: 'CI',
  };

  const cpRes = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cpPayload),
  });
  const cpData: any = await cpRes.json();
  if (!cpRes.ok || !cpData?.data?.payment_url) {
    console.error('[CinetPay] init error:', cpData);
    return res.status(502).json({ error: cpData?.message || 'Erreur lors de l\'initialisation du paiement' });
  }

  // Pour un batch : mettre à jour la ligne batch_pending (transaction_id = batch_ref) avec la vraie
  // référence CinetPay, en FUSIONNANT raw_response (||) pour préserver les tracking_numbers du lot.
  // Sinon /cinetpay/notify ne retrouve pas les colis du batch (bug historique : batch_ref ignoré).
  if (batch_ref) {
    await pool.query(
      `UPDATE automated_payments SET transaction_id = $1, payment_url = $2, raw_response = raw_response || $3::jsonb, updated_at = NOW()
       WHERE transaction_id = $4`,
      [transactionId, cpData.data.payment_url, JSON.stringify(cpData), batch_ref]
    );
  } else {
    await pool.query(
      `INSERT INTO automated_payments (tracking_number, provider, transaction_id, amount, payment_url, raw_response)
       VALUES ($1, 'cinetpay', $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [tracking_number, transactionId, amount_fcfa, cpData.data.payment_url, JSON.stringify(cpData)]
    );
  }
  return res.json({ payment_url: cpData.data.payment_url, transaction_id: transactionId });
}

// ─── Mobile Money générique (lit le provider actif dans admin_settings) ────────

router.post('/mobile-money/init', async (req: express.Request, res: express.Response) => {
  const { tracking_number, amount_fcfa, customer_name, customer_email, customer_phone } = req.body;
  try {
    const row = await pool.query("SELECT value FROM admin_settings WHERE key = 'payment'");
    const activeProvider: string = (row.rows[0]?.value as any)?.activeProvider ?? 'paystack';

    if (activeProvider === 'cinetpay') {
      return initCinetpay({ tracking_number, amount_fcfa, customer_name, customer_email, customer_phone }, res);
    }
    return initPaystack({ tracking_number, amount_fcfa, customer_name, customer_email, customer_phone }, res);
  } catch (err: any) {
    console.error('[MobileMoney] init error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Mobile Money batch (plusieurs colis en un seul paiement) ────────────────

router.post('/mobile-money/init-batch', async (req: express.Request, res: express.Response) => {
  const { tracking_numbers, customer_name, customer_email, customer_phone } = req.body;
  try {
    if (!Array.isArray(tracking_numbers) || tracking_numbers.length === 0) {
      return res.status(400).json({ error: 'tracking_numbers doit être un tableau non vide' });
    }

    // Récupérer les montants de chaque colis
    const placeholders = tracking_numbers.map((_: string, i: number) => `$${i + 1}`).join(', ');
    const shipmentsResult = await pool.query(
      `SELECT
         tracking_number,
         price,
         printing_fee,
         assistance_fee,
         box_price,
         payment_status,
         payment_method
       FROM shipments
       WHERE tracking_number IN (${placeholders})`,
      tracking_numbers
    );

    if (shipmentsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aucun colis trouvé pour ces numéros de suivi' });
    }

    // Vérifier qu'aucun colis n'est déjà payé
    const alreadyPaid = shipmentsResult.rows.filter((s: any) =>
      (s.payment_status || '').toLowerCase() === 'paid'
    );
    if (alreadyPaid.length > 0) {
      return res.status(400).json({
        error: `${alreadyPaid.length} colis déjà payé(s) : ${alreadyPaid.map((s: any) => s.tracking_number).join(', ')}`,
        already_paid: alreadyPaid.map((s: any) => s.tracking_number),
      });
    }

    // Calculer le montant total
    const toNum = (v: unknown) => {
      const n = parseFloat(String(v ?? '0'));
      return isFinite(n) ? n : 0;
    };
    const total_fcfa = shipmentsResult.rows.reduce((sum: number, s: any) => {
      return sum + toNum(s.price) + toNum(s.printing_fee) + toNum(s.assistance_fee) + toNum(s.box_price);
    }, 0);

    if (total_fcfa <= 0) {
      return res.status(400).json({ error: 'Montant total invalide (0 ou négatif)' });
    }

    // Identifier le premier tracking_number comme référence principale
    // Les autres seront mis à jour via webhook en utilisant le batch_ref
    const primary_tracking = tracking_numbers[0];
    const batch_ref = `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Enregistrer le batch en base
    await pool.query(
      `INSERT INTO automated_payments (tracking_number, provider, transaction_id, amount, raw_response)
       VALUES ($1, 'batch_pending', $2, $3, $4::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        primary_tracking,
        batch_ref,
        total_fcfa,
        JSON.stringify({ tracking_numbers, batch_ref }),
      ]
    );

    // Lire le provider actif
    const row = await pool.query("SELECT value FROM admin_settings WHERE key = 'payment'");
    const activeProvider: string = (row.rows[0]?.value as any)?.activeProvider ?? 'paystack';

    // Initier le paiement unique pour le montant total
    // callback_url pointe sur le premier colis pour que PaymentSuccessPage puisse afficher un résultat lisible
    // Le webhook Paystack (détection BATCH-) gère la mise à jour de TOUS les colis
    const payload: InitPayload = {
      tracking_number: batch_ref,   // référence interne Paystack (metadata + webhook lookup)
      amount_fcfa: total_fcfa,
      customer_name: customer_name || '',
      customer_email: customer_email || '',
      customer_phone: customer_phone || '',
    };

    // On surcharge callback_url via un champ dédié pour que la page de succès redirige vers
    // le premier colis réel (pas vers BATCH-xxx qui n'existe pas en tant que colis)
    // initPaystack accepte un override de callback_url via le champ optionnel
    if (activeProvider === 'cinetpay') {
      return initCinetpay({ ...payload, tracking_number: tracking_numbers[0] }, res, batch_ref);
    }
    return initPaystack({ ...payload, tracking_number: tracking_numbers[0] }, res, batch_ref);
  } catch (err: any) {
    console.error('[MobileMoney batch] init error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Paystack (accès direct, conservé pour compatibilité) ────────────────────

router.post('/paystack/init', async (req: express.Request, res: express.Response) => {
  const { tracking_number, amount_fcfa, customer_name, customer_email, customer_phone } = req.body;
  try {
    return await initPaystack({ tracking_number, amount_fcfa, customer_name, customer_email, customer_phone }, res);
  } catch (err: any) {
    console.error('[Paystack] init error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CinetPay (accès direct, conservé pour compatibilité) ────────────────────

router.post('/cinetpay/init', async (req: express.Request, res: express.Response) => {
  const { tracking_number, amount_fcfa, customer_name, customer_email, customer_phone } = req.body;
  try {
    return await initCinetpay({ tracking_number, amount_fcfa, customer_name, customer_email, customer_phone }, res);
  } catch (err: any) {
    console.error('[CinetPay] init error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/cinetpay/notify', async (req: express.Request, res: express.Response) => {
  const { cpm_trans_id } = req.body;
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;

  try {
    // Vérifie le statut auprès de CinetPay
    const verifyRes = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: cpm_trans_id }),
    });

    const verifyData: any = await verifyRes.json();
    const isPaid = verifyData?.data?.status === 'ACCEPTED';

    if (isPaid) {
      await pool.query(
        `UPDATE automated_payments
         SET status = 'confirmed', webhook_received_at = NOW(), raw_response = raw_response || $1::jsonb, updated_at = NOW()
         WHERE transaction_id = $2`,
        [JSON.stringify(verifyData), cpm_trans_id]
      );

      // Résoudre les colis : batch (tracking_numbers dans raw_response) ou colis simple
      const apRow = await pool.query(
        `SELECT tracking_number, raw_response FROM automated_payments WHERE transaction_id = $1`,
        [cpm_trans_id]
      );
      let trackingNumbers: string[] = [];
      try {
        const raw = apRow.rows[0]?.raw_response;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed?.tracking_numbers)) trackingNumbers = parsed.tracking_numbers;
      } catch { /* ignore */ }
      if (trackingNumbers.length === 0 && apRow.rows[0]?.tracking_number) {
        trackingNumbers = [String(apRow.rows[0].tracking_number)];
      }

      // CinetPay renvoie le montant en FCFA (pas en kobo) → ×100 pour comparer.
      const paidKobo = toNumber(verifyData?.data?.amount) * 100;
      const { kobo: expectedKobo } = await getExpectedAmountKobo(trackingNumbers);
      if (!amountCovers(paidKobo, expectedKobo)) {
        console.error(`[CinetPay] amount mismatch — paid=${paidKobo} expected=${expectedKobo} (tx: ${cpm_trans_id}); shipments NOT marked paid`);
      } else if (trackingNumbers.length > 0) {
        const ph = trackingNumbers.map((_: string, i: number) => `$${i + 1}`).join(', ');
        await pool.query(
          `UPDATE shipments SET payment_status = 'paid', payment_method = 'cinetpay', updated_at = NOW()
           WHERE tracking_number IN (${ph}) AND payment_status = 'pending'`,
          trackingNumbers
        );
        await dispatchHomePickups(trackingNumbers);
      }
    } else {
      await pool.query(
        `UPDATE automated_payments
         SET status = $1, webhook_received_at = NOW(), raw_response = raw_response || $2::jsonb, updated_at = NOW()
         WHERE transaction_id = $3`,
        ['failed', JSON.stringify(verifyData), cpm_trans_id]
      );
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[CinetPay] notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Status paiement automatisé ───────────────────────────────────────────────

// Vérification post-redirect : appelle l'API Paystack pour confirmer le paiement et met à jour la DB
router.post('/paystack/verify', async (req: express.Request, res: express.Response) => {
  try {
    const { reference, tracking_number } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference requis' });

    const secretKey = PAYSTACK_SECRET_KEY;
    if (!secretKey) return res.status(503).json({ error: 'PAYSTACK_NOT_CONFIGURED' });

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verifyData: any = await verifyRes.json();
    const isSuccess = verifyData?.data?.status === 'success';
    const paidKobo = toNumber(verifyData?.data?.amount);
    const metaBatchRef: string | null = verifyData?.data?.metadata?.batch_ref || null;
    const metaTracking: string | null = verifyData?.data?.metadata?.tracking_number || null;

    // Matérialise / met à jour la transaction côté serveur. Le flux popup inline ne crée
    // aucune ligne automated_payments à l'init → on la crée ici (UPDATE puis INSERT si absente).
    const upd = await pool.query(
      `UPDATE automated_payments
       SET status = $1, raw_response = COALESCE(raw_response, '{}'::jsonb) || $2::jsonb, updated_at = NOW()
       WHERE transaction_id = $3`,
      [isSuccess ? 'confirmed' : 'failed', JSON.stringify(verifyData?.data ?? {}), reference]
    );
    if (upd.rowCount === 0) {
      await pool.query(
        `INSERT INTO automated_payments (tracking_number, provider, transaction_id, amount, status, raw_response)
         VALUES ($1, 'paystack', $2, $3, $4, $5::jsonb)`,
        [metaTracking || tracking_number || null, reference, paidKobo / 100, isSuccess ? 'confirmed' : 'failed', JSON.stringify(verifyData?.data ?? {})]
      );
    }

    if (!isSuccess) {
      return res.json({ paid: false, status: verifyData?.data?.status, reference });
    }

    // Déterminer les colis concernés (batch via raw_response, sinon le colis demandé)
    let trackingNumbers: string[] = [];
    if (metaBatchRef) {
      const batchRow = await pool.query(
        `SELECT raw_response FROM automated_payments WHERE transaction_id = $1`,
        [reference]
      );
      try {
        const raw = batchRow.rows[0]?.raw_response;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed?.tracking_numbers)) trackingNumbers = parsed.tracking_numbers;
      } catch { /* ignore */ }
    } else if (tracking_number) {
      // Anti-rejeu : la transaction Paystack doit cibler le colis demandé
      if (metaTracking && metaTracking !== tracking_number) {
        console.warn(`[Paystack] verify tracking mismatch: meta=${metaTracking} req=${tracking_number} (ref: ${reference})`);
        return res.json({ paid: false, status: 'tracking_mismatch', reference });
      }
      trackingNumbers = [tracking_number];
    }

    // Vérification du montant côté serveur (source de vérité = prix DB)
    const { kobo: expectedKobo } = await getExpectedAmountKobo(trackingNumbers);
    if (!amountCovers(paidKobo, expectedKobo)) {
      console.error(`[Paystack] verify amount mismatch — paid=${paidKobo} expected=${expectedKobo} (ref: ${reference}); NOT marking paid`);
      return res.json({ paid: false, status: 'amount_mismatch', reference, amount: paidKobo, expected: expectedKobo });
    }

    if (trackingNumbers.length > 0) {
      const ph = trackingNumbers.map((_: string, i: number) => `$${i + 1}`).join(', ');
      await pool.query(
        `UPDATE shipments SET payment_status = 'paid', payment_method = 'paystack', updated_at = NOW()
         WHERE tracking_number IN (${ph}) AND payment_status = 'pending'`,
        trackingNumbers
      );
      for (const tn of trackingNumbers) {
        await pool.query(
          `INSERT INTO shipment_tracking (shipment_id, status, notes, created_at)
           SELECT id, 'PAYMENT_CONFIRMED', 'Paiement confirmé via Paystack (ref: ' || $2 || ')', NOW()
           FROM shipments WHERE tracking_number = $1`,
          [tn, reference]
        );
      }
      await dispatchHomePickups(trackingNumbers);
    }

    return res.json({ paid: true, status: verifyData?.data?.status, amount: paidKobo, reference });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/automated/:trackingNumber', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const { trackingNumber } = req.params;
    const result = await pool.query(
      `SELECT provider, transaction_id, status, amount, created_at
       FROM automated_payments WHERE tracking_number = $1
       ORDER BY created_at DESC LIMIT 1`,
      [trackingNumber]
    );
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
