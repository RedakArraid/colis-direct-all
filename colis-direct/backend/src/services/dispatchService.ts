import { pool } from '../db/connection';

/** Tour 1 : un seul livreur, délai court. Tours 2+ : broadcast parallèle. */
const OFFER_DURATION_ROUND1_SECONDS = 60;
const OFFER_DURATION_PARALLEL_SECONDS = 180;
const PARALLEL_OFFER_COUNT = 3;
const MAX_OFFER_ROUNDS = 5;

type PickupCoords = { latitude: number; longitude: number };

/**
 * Sélectionne les meilleurs livreurs disponibles pour un colis
 * et crée les offres de course en cascade (tour 1) puis en parallèle (tours 2+).
 */
async function resolveDispatchZoneId(shipment: {
  origin_relay_id?: string | null;
  pickup_method?: string | null;
  sender_commune?: string | null;
  home_delivery?: boolean | null;
  recipient_commune?: string | null;
  destination_relay_id?: string | null;
}): Promise<string | null> {
  if (shipment.origin_relay_id) {
    const rp = await pool.query('SELECT zone_id FROM relay_points WHERE id = $1', [shipment.origin_relay_id]);
    if (rp.rows[0]?.zone_id) return rp.rows[0].zone_id;
  }
  const commune =
    shipment.pickup_method === 'home_pickup'
      ? shipment.sender_commune
      : shipment.home_delivery
        ? shipment.recipient_commune
        : null;
  if (commune) {
    const dz = await pool.query(
      `SELECT id FROM delivery_zones WHERE $1 = ANY(communes) AND is_active = true LIMIT 1`,
      [commune]
    );
    if (dz.rows[0]?.id) return dz.rows[0].id;
  }
  if (shipment.destination_relay_id) {
    const rp = await pool.query('SELECT zone_id FROM relay_points WHERE id = $1', [shipment.destination_relay_id]);
    if (rp.rows[0]?.zone_id) return rp.rows[0].zone_id;
  }
  return null;
}

/** Point de collecte : GPS expéditeur (home_pickup) ou coordonnées du relais d'origine. */
async function resolvePickupCoords(shipment: {
  sender_latitude?: number | string | null;
  sender_longitude?: number | string | null;
  origin_relay_id?: string | null;
}): Promise<PickupCoords | null> {
  const lat = Number(shipment.sender_latitude);
  const lng = Number(shipment.sender_longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  if (shipment.origin_relay_id) {
    const rp = await pool.query(
      'SELECT latitude, longitude FROM relay_points WHERE id = $1',
      [shipment.origin_relay_id]
    );
    const rLat = Number(rp.rows[0]?.latitude);
    const rLng = Number(rp.rows[0]?.longitude);
    if (Number.isFinite(rLat) && Number.isFinite(rLng)) {
      return { latitude: rLat, longitude: rLng };
    }
  }
  return null;
}

function offerDurationSeconds(round: number): number {
  return round <= 1 ? OFFER_DURATION_ROUND1_SECONDS : OFFER_DURATION_PARALLEL_SECONDS;
}

function offerBatchSize(round: number): number {
  return round <= 1 ? 1 : PARALLEL_OFFER_COUNT;
}

async function hasPendingOffers(shipmentId: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM delivery_offers WHERE shipment_id = $1 AND status = 'pending' LIMIT 1`,
    [shipmentId]
  );
  return r.rows.length > 0;
}

async function dispatchShipment(shipmentId: string): Promise<void> {
  const shipmentRes = await pool.query(`SELECT s.* FROM shipments s WHERE s.id = $1`, [shipmentId]);

  if (shipmentRes.rows.length === 0) {
    throw new Error(`Colis ${shipmentId} introuvable`);
  }

  const shipment = shipmentRes.rows[0];
  const originZoneId = await resolveDispatchZoneId(shipment);

  const existingOfferRes = await pool.query(
    `SELECT id FROM delivery_offers WHERE shipment_id = $1 AND status = 'pending'`,
    [shipmentId]
  );
  if (existingOfferRes.rows.length > 0) return;

  if (shipment.transporter_id) return;

  await continueDispatch(shipmentId, 1, originZoneId);
}

/**
 * Envoie la prochaine vague d'offres (tour N).
 * Tour 1 : 1 livreur / 60 s. Tours 2–5 : jusqu'à 3 livreurs en parallèle / 3 min.
 */
async function continueDispatch(
  shipmentId: string,
  round: number,
  originZoneId?: string | null
): Promise<void> {
  if (round > MAX_OFFER_ROUNDS) {
    await createAdminAlert(shipmentId);
    return;
  }

  if (await hasPendingOffers(shipmentId)) return;

  const contactedRes = await pool.query(
    `SELECT transporter_id FROM delivery_offers WHERE shipment_id = $1`,
    [shipmentId]
  );
  const alreadyContacted = contactedRes.rows.map((r: { transporter_id: string }) => r.transporter_id);

  const shipmentRes = await pool.query(`SELECT s.* FROM shipments s WHERE s.id = $1`, [shipmentId]);
  if (shipmentRes.rows.length === 0) return;

  const shipment = shipmentRes.rows[0];
  if (shipment.transporter_id) return;

  const zoneId = originZoneId ?? (await resolveDispatchZoneId(shipment));
  const pickup = await resolvePickupCoords(shipment);
  const batchSize = offerBatchSize(round);

  const candidatesRes = await pool.query(
    `SELECT
        t.id,
        t.user_id,
        t.current_packages,
        CASE WHEN EXISTS (
          SELECT 1 FROM transporter_delivery_zones tdz
          WHERE tdz.transporter_id = t.id AND tdz.zone_id = $4
        ) THEN 1 ELSE 2 END AS zone_priority,
        COALESCE(t.current_packages, 0) AS load_score,
        CASE
          WHEN $1::double precision IS NOT NULL AND $2::double precision IS NOT NULL
               AND t.current_latitude IS NOT NULL AND t.current_longitude IS NOT NULL
          THEN (
            6371 * acos(LEAST(1.0, GREATEST(-1.0,
              cos(radians($1::double precision)) * cos(radians(t.current_latitude))
              * cos(radians(t.current_longitude) - radians($2::double precision))
              + sin(radians($1::double precision)) * sin(radians(t.current_latitude))
            )))
          )
          ELSE NULL
        END AS distance_km
     FROM transporters t
     WHERE t.status = 'available'
       AND t.id != ALL($3::uuid[])
     ORDER BY zone_priority ASC, distance_km ASC NULLS LAST, load_score ASC, t.updated_at ASC
     LIMIT $5`,
    [
      pickup?.latitude ?? null,
      pickup?.longitude ?? null,
      alreadyContacted.length > 0 ? alreadyContacted : ['00000000-0000-0000-0000-000000000000'],
      zoneId || null,
      batchSize,
    ]
  );

  if (candidatesRes.rows.length === 0) {
    await createAdminAlert(shipmentId);
    return;
  }

  const commissionRes = await pool.query(
    `SELECT rate_percent FROM commission_settings WHERE is_active = true ORDER BY effective_from DESC LIMIT 1`
  );
  const commissionRate = parseFloat(commissionRes.rows[0]?.rate_percent || '20');
  const netEarnings = parseFloat(shipment.price || '0') * (1 - commissionRate / 100);
  const netRounded = Math.round(netEarnings);

  const expiresAt = new Date(Date.now() + offerDurationSeconds(round) * 1000);

  for (const candidate of candidatesRes.rows) {
    await pool.query(
      `INSERT INTO delivery_offers
         (shipment_id, transporter_id, expires_at, offer_round, net_earnings_fcfa)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (shipment_id, transporter_id, offer_round) DO NOTHING`,
      [shipmentId, candidate.id, expiresAt, round, netRounded]
    );

    const distanceKm =
      candidate.distance_km != null && Number.isFinite(Number(candidate.distance_km))
        ? Math.round(Number(candidate.distance_km) * 10) / 10
        : null;

    await notifyTransporter(candidate.user_id, shipmentId, netRounded, {
      round,
      parallel: batchSize > 1,
      expiresInSeconds: offerDurationSeconds(round),
      distanceKm,
    });
  }
}

/**
 * Traiter les offres expirées et déclencher la cascade suivante.
 * N'avance pas tant qu'il reste des offres pending sur le même colis.
 */
async function processExpiredOffers(): Promise<void> {
  const expiredRes = await pool.query(
    `UPDATE delivery_offers
     SET status = 'expired', responded_at = NOW()
     WHERE status = 'pending' AND expires_at < NOW()
     RETURNING shipment_id, offer_round`
  );

  const processed = new Set<string>();

  for (const expired of expiredRes.rows) {
    const sid = String(expired.shipment_id);
    if (processed.has(sid)) continue;
    processed.add(sid);

    if (await hasPendingOffers(sid)) continue;

    const shipmentCheck = await pool.query(`SELECT transporter_id FROM shipments WHERE id = $1`, [sid]);
    if (shipmentCheck.rows[0]?.transporter_id) continue;

    continueDispatch(sid, Number(expired.offer_round) + 1, undefined).catch((err) =>
      console.error('Continue dispatch error:', err)
    );
  }
}

async function creditTransporterWallet(shipmentId: string, transporterId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingCredit = await client.query(
      `SELECT id FROM wallet_transactions
       WHERE shipment_id = $1 AND transporter_id = $2 AND type = 'commission_earned'`,
      [shipmentId, transporterId]
    );
    if (existingCredit.rows.length > 0) {
      await client.query('ROLLBACK');
      return;
    }

    const shipmentRes = await client.query(`SELECT price FROM shipments WHERE id = $1`, [shipmentId]);
    if (shipmentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    const grossAmount = parseFloat(shipmentRes.rows[0].price || '0');

    const commissionRes = await client.query(
      `SELECT rate_percent FROM commission_settings WHERE is_active = true ORDER BY effective_from DESC LIMIT 1`
    );
    const commissionRate = parseFloat(commissionRes.rows[0]?.rate_percent || '20');
    const colisdirectFee = Math.round(grossAmount * (commissionRate / 100));
    const netAmount = grossAmount - colisdirectFee;

    await client.query(
      `INSERT INTO wallet_transactions
         (transporter_id, shipment_id, type, amount_fcfa, commission_rate_percent,
          gross_amount_fcfa, colisdirect_fee_fcfa, status)
       VALUES ($1, $2, 'commission_earned', $3, $4, $5, $6, 'completed')`,
      [transporterId, shipmentId, netAmount, commissionRate, grossAmount, colisdirectFee]
    );

    await client.query(
      `INSERT INTO transporter_wallets (transporter_id, balance_fcfa, total_earned_fcfa)
       VALUES ($1, $2, $2)
       ON CONFLICT (transporter_id) DO UPDATE
         SET balance_fcfa      = transporter_wallets.balance_fcfa + $2,
             total_earned_fcfa = transporter_wallets.total_earned_fcfa + $2,
             updated_at        = NOW()`,
      [transporterId, netAmount]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function notifyTransporter(
  userId: string,
  shipmentId: string,
  netEarnings: number,
  meta: {
    round: number;
    parallel: boolean;
    expiresInSeconds: number;
    distanceKm: number | null;
  }
): Promise<void> {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      )
    `);
    if (!tableCheck.rows[0]?.exists) return;

    const mins = Math.max(1, Math.round(meta.expiresInSeconds / 60));
    const distPart =
      meta.distanceKm != null ? ` · ~${meta.distanceKm} km` : '';
    const parallelPart = meta.parallel ? ' (offre groupée)' : '';

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, data)
       VALUES ($1, $2, $3, 'new_delivery_offer', $4::jsonb)`,
      [
        userId,
        '🚀 Nouvelle course disponible !',
        `Gains estimés : ${netEarnings.toLocaleString('fr-FR')} FCFA${distPart}. Acceptez sous ${mins} min${parallelPart}.`,
        JSON.stringify({
          shipment_id: shipmentId,
          net_earnings_fcfa: netEarnings,
          offer_round: meta.round,
          parallel: meta.parallel,
          expires_in_seconds: meta.expiresInSeconds,
          distance_km: meta.distanceKm,
        }),
      ]
    );
  } catch {
    // Notifications non critiques
  }
}

async function createAdminAlert(shipmentId: string): Promise<void> {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      )
    `);
    if (!tableCheck.rows[0]?.exists) return;

    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of adminRes.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, data)
         VALUES ($1, $2, $3, 'dispatch_failed', $4::jsonb)`,
        [
          admin.id,
          '⚠️ Colis sans livreur',
          `Aucun livreur disponible pour le colis ${shipmentId}. Assignation manuelle nécessaire.`,
          JSON.stringify({ shipment_id: shipmentId }),
        ]
      );
    }
  } catch {
    // Non critique
  }
}

export default {
  dispatchShipment,
  continueDispatch,
  processExpiredOffers,
  creditTransporterWallet,
  hasPendingOffers,
};
