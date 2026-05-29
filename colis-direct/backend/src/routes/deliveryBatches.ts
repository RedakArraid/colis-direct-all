import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// GET /api/delivery-batches/my-batches — lots offerts au livreur connecté
router.get('/my-batches', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    // Marquer les lots expirés avant de récupérer la liste
    await pool.query(
      `UPDATE delivery_batches
       SET status = 'expired', updated_at = NOW()
       WHERE transporter_id = $1 AND status = 'dispatched' AND expires_at < NOW()`,
      [transporterId]
    );

    const result = await pool.query(
      `SELECT
          db.*,
          rp.name AS origin_relay_name,
          rp.address AS origin_relay_address,
          rp.commune AS origin_relay_commune,
          dz.name AS destination_zone_name
       FROM delivery_batches db
       LEFT JOIN relay_points rp ON rp.id = db.origin_relay_id
       LEFT JOIN delivery_zones dz ON dz.id = db.destination_zone_id
       WHERE db.transporter_id = $1 AND db.status = 'dispatched'
       ORDER BY db.offered_at DESC`,
      [transporterId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my batches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-batches/:id/accept — livreur accepte le lot
router.post('/:id/accept', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    const batchRes = await pool.query(
      'SELECT * FROM delivery_batches WHERE id = $1 AND transporter_id = $2',
      [id, transporterId]
    );
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }

    const batch = batchRes.rows[0];

    if (batch.status !== 'dispatched') {
      return res.status(400).json({ error: `Ce lot n'est plus disponible (statut: ${batch.status})` });
    }
    if (batch.expires_at && new Date(batch.expires_at) < new Date()) {
      await pool.query(
        `UPDATE delivery_batches SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return res.status(400).json({ error: 'Ce lot a expiré' });
    }

    // Récupérer les colis du lot
    const shipmentsRes = await pool.query(
      `SELECT bs.shipment_id, s.tracking_number
       FROM batch_shipments bs
       JOIN shipments s ON s.id = bs.shipment_id
       WHERE bs.batch_id = $1
       ORDER BY bs.sequence_order ASC`,
      [id]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Accepter le lot
      await client.query(
        `UPDATE delivery_batches
         SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      for (const row of shipmentsRes.rows) {
        // Assigner le livreur à chaque colis
        await client.query(
          `UPDATE shipments
           SET transporter_id = $1, current_status = 'CARRIER_COLLECTED', updated_at = NOW()
           WHERE id = $2`,
          [transporterId, row.shipment_id]
        );

        // Créer l'entrée d'assignation
        await client.query(
          `INSERT INTO transporter_assignments (transporter_id, shipment_id, assignment_status, expected_pickup_at)
           VALUES ($1, $2, 'pending', NOW() + INTERVAL '2 hours')
           ON CONFLICT (transporter_id, shipment_id) DO UPDATE
             SET assignment_status = 'pending', expected_pickup_at = NOW() + INTERVAL '2 hours'`,
          [transporterId, row.shipment_id]
        );

        // Événement de tracking
        await client.query(
          `INSERT INTO tracking_events (shipment_id, tracking_number, status, scanner_id, scanner_type, notes)
           VALUES ($1, $2, 'CARRIER_COLLECTED', $3, 'transporter', 'Livreur a accepté le lot groupé')`,
          [row.shipment_id, row.tracking_number, req.user!.id]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Lot de ${shipmentsRes.rows.length} colis accepté`,
        batch_id: id,
        shipment_count: shipmentsRes.rows.length,
        net_earnings_fcfa: batch.net_earnings_fcfa,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Accept batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-batches/:id/decline — livreur refuse le lot
router.post('/:id/decline', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    const batchRes = await pool.query(
      `SELECT * FROM delivery_batches WHERE id = $1 AND transporter_id = $2 AND status = 'dispatched'`,
      [id, transporterId]
    );
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé ou plus disponible' });
    }

    // Réinitialiser pour re-dispatch — on conserve l'historique via les champs nullifiés
    await pool.query(
      `UPDATE delivery_batches
       SET status = 'pending', transporter_id = NULL, offered_at = NULL, expires_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Lot décliné' });
  } catch (error: any) {
    console.error('Decline batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery-batches/admin — tous les lots (admin) avec pagination
router.get('/admin', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 200);
    const offset = parseInt(req.query.offset as string || '0');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`db.status = $${paramIdx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT
          db.*,
          rp.name AS origin_relay_name,
          rp.commune AS origin_relay_commune,
          dz.name AS destination_zone_name,
          t.vehicle_type AS transporter_vehicle_type,
          u.first_name AS transporter_first_name,
          u.last_name AS transporter_last_name
       FROM delivery_batches db
       LEFT JOIN relay_points rp ON rp.id = db.origin_relay_id
       LEFT JOIN delivery_zones dz ON dz.id = db.destination_zone_id
       LEFT JOIN transporters t ON t.id = db.transporter_id
       LEFT JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY db.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM delivery_batches db ${where}`,
      params.slice(0, -2)
    );

    res.json({
      batches: result.rows,
      total: parseInt(countRes.rows[0].count),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Admin get batches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery-batches/admin/stats — KPIs des lots (admin)
router.get('/admin/stats', authenticate, requireRole('admin', 'support'), async (_req: AuthRequest, res) => {
  try {
    const statsRes = await pool.query(
      `SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'dispatched') AS dispatched,
          COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'expired') AS expired,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          COUNT(*) AS total,
          COALESCE(SUM(shipment_count), 0) AS total_shipments_batched,
          COALESCE(SUM(net_earnings_fcfa) FILTER (WHERE status = 'completed'), 0) AS total_earnings_paid
       FROM delivery_batches`
    );

    res.json(statsRes.rows[0]);
  } catch (error: any) {
    console.error('Admin batch stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery-batches/relay/:relayId/pending — colis en attente de lot pour ce relais
router.get('/relay/:relayId/pending', authenticate, requireRole('relay_partner', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { relayId } = req.params;

    // Vérifier l'accès si relay_partner
    if (req.user!.role === 'relay_partner') {
      const relayCheck = await pool.query(
        'SELECT id FROM relay_points WHERE id = $1 AND owner_id = $2',
        [relayId, req.user!.id]
      );
      if (relayCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }

    const result = await pool.query(
      `SELECT
          s.id,
          s.tracking_number,
          s.recipient_commune,
          s.recipient_address,
          s.package_type,
          s.weight,
          s.price,
          s.created_at,
          s.home_delivery,
          bs.batch_id,
          db.status AS batch_status
       FROM shipments s
       LEFT JOIN batch_shipments bs ON bs.shipment_id = s.id
       LEFT JOIN delivery_batches db ON db.id = bs.batch_id AND db.status NOT IN ('cancelled', 'expired', 'completed')
       WHERE s.origin_relay_id = $1
         AND s.current_status = 'RELAY_ORIGIN_RECEIVED'
         AND s.transporter_id IS NULL
       ORDER BY s.created_at ASC`,
      [relayId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Relay pending batches error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
