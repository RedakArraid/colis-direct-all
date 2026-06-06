import { pool } from '../db/connection';

const OFFER_DURATION_MINUTES = 3;
const MAX_OFFER_ROUNDS = 5; // Nombre max de livreurs à contacter avant alerte admin

/**
 * Sélectionne les meilleurs livreurs disponibles pour un colis
 * et crée les offres de course en cascade.
 */
/** Zone de dispatch : relais d'origine, ou commune expéditeur (home_pickup). */
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

async function dispatchShipment(shipmentId: string): Promise<void> {
  const shipmentRes = await pool.query(
    `SELECT s.*
     FROM shipments s
     WHERE s.id = $1`,
    [shipmentId]
  );

  if (shipmentRes.rows.length === 0) {
    throw new Error(`Colis ${shipmentId} introuvable`);
  }

  const shipment = shipmentRes.rows[0];
  const originZoneId = await resolveDispatchZoneId(shipment);

  // Vérifier qu'il n'y a pas déjà une offre active ou un livreur assigné
  const existingOfferRes = await pool.query(
    `SELECT id FROM delivery_offers WHERE shipment_id = $1 AND status = 'pending'`,
    [shipmentId]
  );
  if (existingOfferRes.rows.length > 0) {
    // Dispatch déjà en cours
    return;
  }

  if (shipment.transporter_id) {
    // Livreur déjà assigné
    return;
  }

  await continueDispatch(shipmentId, 1, originZoneId);
}

/**
 * Envoie la prochaine offre dans la cascade (round N)
 */
async function continueDispatch(shipmentId: string, round: number, originZoneId?: string | null): Promise<void> {
  if (round > MAX_OFFER_ROUNDS) {
    // Alerte admin : aucun livreur disponible
    await createAdminAlert(shipmentId);
    return;
  }

  // Récupérer les livreurs déjà contactés pour ce colis
  const contactedRes = await pool.query(
    `SELECT transporter_id FROM delivery_offers WHERE shipment_id = $1`,
    [shipmentId]
  );
  const alreadyContacted = contactedRes.rows.map((r: any) => r.transporter_id);

  const shipmentRes = await pool.query(`SELECT s.* FROM shipments s WHERE s.id = $1`, [shipmentId]);

  if (shipmentRes.rows.length === 0) return;
  const shipment = shipmentRes.rows[0];
  const zoneId = originZoneId ?? (await resolveDispatchZoneId(shipment));

  // Trouver le meilleur livreur disponible non encore contacté
  const candidatesRes = await pool.query(
    `SELECT
        t.id,
        t.user_id,
        t.current_packages,
        t.status,
        -- Priorité zone : livreur dans la même zone que le relais d'origine
        CASE WHEN EXISTS (
          SELECT 1 FROM transporter_delivery_zones tdz
          WHERE tdz.transporter_id = t.id AND tdz.zone_id = $1
        ) THEN 1 ELSE 2 END AS zone_priority,
        -- Score charge : moins de colis = meilleur
        COALESCE(t.current_packages, 0) AS load_score
     FROM transporters t
     WHERE t.status = 'available'
       AND t.id != ALL($2::uuid[])
     ORDER BY zone_priority ASC, load_score ASC, t.updated_at ASC
     LIMIT 1`,
    [
      zoneId || null,
      alreadyContacted.length > 0 ? alreadyContacted : ['00000000-0000-0000-0000-000000000000'],
    ]
  );

  if (candidatesRes.rows.length === 0) {
    await createAdminAlert(shipmentId);
    return;
  }

  const candidate = candidatesRes.rows[0];

  // Calculer les gains nets du livreur
  const commissionRes = await pool.query(
    `SELECT rate_percent FROM commission_settings WHERE is_active = true ORDER BY effective_from DESC LIMIT 1`
  );
  const commissionRate = parseFloat(commissionRes.rows[0]?.rate_percent || '20');
  const netEarnings = parseFloat(shipment.price || '0') * (1 - commissionRate / 100);

  const expiresAt = new Date(Date.now() + OFFER_DURATION_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO delivery_offers
       (shipment_id, transporter_id, expires_at, offer_round, net_earnings_fcfa)
     VALUES ($1, $2, $3, $4, $5)`,
    [shipmentId, candidate.id, expiresAt, round, Math.round(netEarnings)]
  );

  // Notifier le livreur (via la table notifications)
  await notifyTransporter(candidate.user_id, shipmentId, Math.round(netEarnings));
}

/**
 * Traiter les offres expirées et déclencher la cascade
 * Appelé par un cron job toutes les minutes
 */
async function processExpiredOffers(): Promise<void> {
  const expiredRes = await pool.query(
    `UPDATE delivery_offers
     SET status = 'expired', responded_at = NOW()
     WHERE status = 'pending' AND expires_at < NOW()
     RETURNING shipment_id, offer_round`
  );

  for (const expired of expiredRes.rows) {
    // Vérifier que le colis n'a pas déjà été assigné entre-temps
    const shipmentCheck = await pool.query(
      `SELECT transporter_id FROM shipments WHERE id = $1`,
      [expired.shipment_id]
    );
    if (shipmentCheck.rows[0]?.transporter_id) continue;

    // Continuer la cascade vers le prochain livreur
    continueDispatch(expired.shipment_id, expired.offer_round + 1, undefined).catch((err) =>
      console.error('Continue dispatch error:', err)
    );
  }
}

/**
 * Créditer le portefeuille du livreur après livraison confirmée
 */
async function creditTransporterWallet(
  shipmentId: string,
  transporterId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Éviter double crédit
    const existingCredit = await client.query(
      `SELECT id FROM wallet_transactions
       WHERE shipment_id = $1 AND transporter_id = $2 AND type = 'commission_earned'`,
      [shipmentId, transporterId]
    );
    if (existingCredit.rows.length > 0) {
      await client.query('ROLLBACK');
      return;
    }

    const shipmentRes = await client.query(
      `SELECT price FROM shipments WHERE id = $1`,
      [shipmentId]
    );
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

    // Insérer la transaction
    await client.query(
      `INSERT INTO wallet_transactions
         (transporter_id, shipment_id, type, amount_fcfa, commission_rate_percent,
          gross_amount_fcfa, colisdirect_fee_fcfa, status)
       VALUES ($1, $2, 'commission_earned', $3, $4, $5, $6, 'completed')`,
      [transporterId, shipmentId, netAmount, commissionRate, grossAmount, colisdirectFee]
    );

    // Mettre à jour le portefeuille
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

/**
 * Créer une notification pour un livreur
 */
async function notifyTransporter(
  userId: string,
  shipmentId: string,
  netEarnings: number
): Promise<void> {
  try {
    // Vérifier que la table notifications existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      )
    `);
    if (!tableCheck.rows[0]?.exists) return;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, data)
       VALUES ($1, $2, $3, 'new_delivery_offer', $4::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        '🚀 Nouvelle course disponible !',
        `Gains estimés : ${netEarnings.toLocaleString()} FCFA. Acceptez dans 3 minutes.`,
        JSON.stringify({ shipment_id: shipmentId, net_earnings_fcfa: netEarnings }),
      ]
    );
  } catch {
    // Notifications non critiques, on ne bloque pas le dispatch
  }
}

/**
 * Créer une alerte admin quand aucun livreur ne peut prendre le colis
 */
async function createAdminAlert(shipmentId: string): Promise<void> {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      )
    `);
    if (!tableCheck.rows[0]?.exists) return;

    // Notifier tous les admins
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
};
