import { pool } from '../db/connection';

interface BatchConfig {
  enabled: boolean;
  minBatchSize: number;
  maxWaitHours: number;
  cronIntervalMinutes: number;
  offerDurationMinutes: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  enabled: true,
  minBatchSize: 3,
  maxWaitHours: 2,
  cronIntervalMinutes: 30,
  offerDurationMinutes: 5,
};

/**
 * Détermine quels types de véhicules peuvent transporter ce lot.
 */
function getRequiredVehicleTypes(
  totalWeightKg: number,
  packageCount: number,
  hasGrand: boolean
): string[] {
  if (totalWeightKg > 50 || (packageCount > 10 && hasGrand)) {
    return ['camionnette'];
  }
  if (totalWeightKg > 20 || (packageCount > 5 && hasGrand)) {
    return ['camionnette', 'voiture'];
  }
  if (totalWeightKg > 10 || packageCount > 5) {
    return ['voiture', 'camionnette', 'moto'];
  }
  if (totalWeightKg > 3) {
    return ['moto', 'voiture', 'velo'];
  }
  return ['moto', 'velo', 'pied', 'voiture'];
}

/**
 * Crée les lots pour un relais donné et déclenche leur dispatch.
 */
async function createBatchesForRelay(relayId: string, config: BatchConfig): Promise<void> {
  // Récupérer tous les colis RELAY_ORIGIN_RECEIVED sans batch ni transporter pour ce relais
  const shipmentsRes = await pool.query(
    `SELECT
        s.id,
        s.recipient_commune,
        s.package_type,
        s.weight,
        s.price,
        s.created_at,
        s.home_delivery,
        dz.id AS zone_id,
        dz.name AS zone_name
     FROM shipments s
     LEFT JOIN delivery_zones dz ON dz.communes @> ARRAY[s.recipient_commune]
     WHERE s.origin_relay_id = $1
       AND s.current_status = 'RELAY_ORIGIN_RECEIVED'
       AND s.transporter_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM batch_shipments bs
         JOIN delivery_batches db ON db.id = bs.batch_id
         WHERE bs.shipment_id = s.id
           AND db.status NOT IN ('cancelled', 'expired', 'completed')
       )
     ORDER BY s.created_at ASC`,
    [relayId]
  );

  if (shipmentsRes.rows.length === 0) return;

  // Grouper par zone ou par commune
  const groups = new Map<string, typeof shipmentsRes.rows>();
  for (const row of shipmentsRes.rows) {
    const key = row.zone_id ? `zone:${row.zone_id}` : `commune:${row.recipient_commune || 'unknown'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const commissionRes = await pool.query(
    `SELECT rate_percent FROM commission_settings WHERE is_active = true ORDER BY effective_from DESC LIMIT 1`
  );
  const commissionRate = parseFloat(commissionRes.rows[0]?.rate_percent || '20');

  for (const [groupKey, rows] of groups.entries()) {
    if (rows.length === 0) continue;

    // Vérifier si le lot doit être créé : count >= min OU plus vieux colis attend >= maxWaitHours
    const oldestAge = (Date.now() - new Date(rows[0].created_at).getTime()) / (1000 * 60 * 60);
    if (rows.length < config.minBatchSize && oldestAge < config.maxWaitHours) continue;

    const totalWeight = rows.reduce((sum, r) => sum + parseFloat(r.weight || '0'), 0);
    const totalValue = rows.reduce((sum, r) => sum + parseFloat(r.price || '0'), 0);
    const netEarnings = Math.round(totalValue * (1 - commissionRate / 100));
    const hasGrand = rows.some((r) => r.package_type === 'grand');
    const requiredVehicleTypes = getRequiredVehicleTypes(totalWeight, rows.length, hasGrand);

    // Déterminer batch_type
    const hasHome = rows.some((r) => r.home_delivery);
    const hasRelay = rows.some((r) => !r.home_delivery);
    let batchType: 'relay_to_relay' | 'relay_to_home' | 'mixed';
    if (hasHome && hasRelay) batchType = 'mixed';
    else if (hasHome) batchType = 'relay_to_home';
    else batchType = 'relay_to_relay';

    // Zone et commune de destination
    let destinationZoneId: string | null = null;
    let destinationCommune: string | null = null;
    if (groupKey.startsWith('zone:')) {
      destinationZoneId = rows[0].zone_id;
      destinationCommune = rows[0].recipient_commune;
    } else {
      destinationCommune = rows[0].recipient_commune;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batchRes = await client.query(
        `INSERT INTO delivery_batches
           (origin_relay_id, destination_zone_id, destination_commune, batch_type,
            shipment_count, total_weight_kg, total_value_fcfa, net_earnings_fcfa,
            required_vehicle_types)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          relayId,
          destinationZoneId,
          destinationCommune,
          batchType,
          rows.length,
          Math.round(totalWeight * 100) / 100,
          totalValue,
          netEarnings,
          requiredVehicleTypes,
        ]
      );

      const batchId = batchRes.rows[0].id;

      for (let i = 0; i < rows.length; i++) {
        await client.query(
          `INSERT INTO batch_shipments (batch_id, shipment_id, sequence_order) VALUES ($1, $2, $3)`,
          [batchId, rows[i].id, i]
        );
      }

      await client.query('COMMIT');

      // Dispatch hors transaction pour ne pas bloquer
      dispatchBatch(batchId, config).catch((err) =>
        console.error(`Batch dispatch error for ${batchId}:`, err.message)
      );
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * Dispatch un lot vers le meilleur transporteur disponible.
 */
async function dispatchBatch(batchId: string, config: BatchConfig): Promise<void> {
  const batchRes = await pool.query(
    `SELECT db.*, rp.zone_id AS origin_zone_id
     FROM delivery_batches db
     LEFT JOIN relay_points rp ON rp.id = db.origin_relay_id
     WHERE db.id = $1 AND db.status = 'pending'`,
    [batchId]
  );

  if (batchRes.rows.length === 0) return;
  const batch = batchRes.rows[0];

  // Livreurs déjà contactés pour ce lot (via offres précédentes = batches declined/expired avec même transporter)
  const alreadyContactedRes = await pool.query(
    `SELECT DISTINCT transporter_id FROM delivery_batches
     WHERE id = $1 AND transporter_id IS NOT NULL`,
    [batchId]
  );
  const alreadyContacted = alreadyContactedRes.rows.map((r: any) => r.transporter_id);

  const candidatesRes = await pool.query(
    `SELECT
        t.id,
        t.user_id,
        t.current_packages,
        CASE WHEN EXISTS (
          SELECT 1 FROM transporter_delivery_zones tdz
          WHERE tdz.transporter_id = t.id AND tdz.zone_id = $1
        ) THEN 1 ELSE 2 END AS zone_priority,
        COALESCE(t.current_packages, 0) AS load_score
     FROM transporters t
     WHERE t.status = 'available'
       AND t.vehicle_type = ANY($2::text[])
       AND t.id != ALL($3::uuid[])
     ORDER BY zone_priority ASC, load_score ASC, t.updated_at ASC
     LIMIT 1`,
    [
      batch.origin_zone_id || null,
      batch.required_vehicle_types,
      alreadyContacted.length > 0 ? alreadyContacted : ['00000000-0000-0000-0000-000000000000'],
    ]
  );

  if (candidatesRes.rows.length === 0) {
    // Aucun livreur disponible — alerter les admins
    await notifyAdminsNoBatchTransporter(batchId, batch.shipment_count);
    return;
  }

  const candidate = candidatesRes.rows[0];
  const offeredAt = new Date();
  const expiresAt = new Date(offeredAt.getTime() + config.offerDurationMinutes * 60 * 1000);

  await pool.query(
    `UPDATE delivery_batches
     SET status = 'dispatched', transporter_id = $1, offered_at = $2, expires_at = $3, updated_at = NOW()
     WHERE id = $4`,
    [candidate.id, offeredAt, expiresAt, batchId]
  );

  await notifyTransporterBatch(
    candidate.user_id,
    batchId,
    batch.shipment_count,
    batch.net_earnings_fcfa,
    config.offerDurationMinutes
  );
}

/**
 * Traite les lots expirés en les réinitialisant pour re-dispatch.
 */
async function processExpiredBatchOffers(): Promise<void> {
  const expiredRes = await pool.query(
    `UPDATE delivery_batches
     SET status = 'pending', transporter_id = NULL, offered_at = NULL, expires_at = NULL, updated_at = NOW()
     WHERE status = 'dispatched' AND expires_at < NOW()
     RETURNING id, shipment_count`
  );

  for (const expired of expiredRes.rows) {
    console.log(`Batch ${expired.id} expired, re-queuing for dispatch`);
  }
}

/**
 * Point d'entrée du cron — traite tous les relais actifs.
 */
async function processAllRelays(): Promise<void> {
  const configRes = await pool.query(
    `SELECT value FROM admin_settings WHERE key = 'batchDispatch'`
  );
  const config: BatchConfig = { ...DEFAULT_CONFIG, ...(configRes.rows[0]?.value || {}) };

  if (!config.enabled) return;

  const relaysRes = await pool.query(
    `SELECT DISTINCT s.origin_relay_id AS id
     FROM shipments s
     WHERE s.current_status = 'RELAY_ORIGIN_RECEIVED'
       AND s.transporter_id IS NULL
       AND s.origin_relay_id IS NOT NULL`
  );

  for (const relay of relaysRes.rows) {
    createBatchesForRelay(relay.id, config).catch((err) =>
      console.error(`createBatchesForRelay error for relay ${relay.id}:`, err.message)
    );
  }
}

async function notifyTransporterBatch(
  userId: string,
  batchId: string,
  shipmentCount: number,
  netEarnings: number,
  offerDurationMinutes: number
): Promise<void> {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
      )
    `);
    if (!tableCheck.rows[0]?.exists) return;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, data)
       VALUES ($1, $2, $3, 'new_batch_offer', $4::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        `Lot de ${shipmentCount} colis disponible !`,
        `Gains estimés : ${Number(netEarnings).toLocaleString()} FCFA. Acceptez dans ${offerDurationMinutes} minutes.`,
        JSON.stringify({ batch_id: batchId, net_earnings_fcfa: netEarnings, shipment_count: shipmentCount }),
      ]
    );
  } catch {
    // Non critique
  }
}

async function notifyAdminsNoBatchTransporter(batchId: string, shipmentCount: number): Promise<void> {
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
          'Lot sans livreur disponible',
          `Aucun livreur disponible pour un lot de ${shipmentCount} colis. Assignation manuelle nécessaire.`,
          JSON.stringify({ batch_id: batchId, shipment_count: shipmentCount }),
        ]
      );
    }
  } catch {
    // Non critique
  }
}

export default {
  getRequiredVehicleTypes,
  createBatchesForRelay,
  dispatchBatch,
  processExpiredBatchOffers,
  processAllRelays,
};
