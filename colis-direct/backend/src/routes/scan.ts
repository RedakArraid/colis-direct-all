import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { processScanBypassFromRole } from '../lib/processScanBypass';

const router = express.Router();

/**
 * POST /api/scan
 * Process a shipment scan event
 * 
 * Body:
 * {
 *   "tracking_number": "CDX123456789FR",
 *   "status": "in_transit",
 *   "location_id": "HUB-PARIS01",
 *   "scanner_id": "EMP-045", (optional, defaults to user ID)
 *   "timestamp": "2025-11-04T10:25:00Z" (optional, defaults to now)
 *   "notes": "Optional notes" (optional)
 * }
 */
router.post('/', authenticate, requireRole('admin', 'relay_partner', 'transporter', 'support', 'support_supervisor'), async (req: AuthRequest, res) => {
  try {
    const {
      tracking_number,
      status,
      location_id,
      scanner_id,
      timestamp,
      notes
    } = req.body;

    // Validate required fields
    if (!tracking_number) {
      return res.status(400).json({ error: 'tracking_number est requis' });
    }

    if (!status) {
      return res.status(400).json({ error: 'status est requis' });
    }

    // Determine scanner type based on user role
    let scanner_type: 'relay' | 'transporter' | 'hub' | 'mobile_app' = 'mobile_app';
    if (req.user!.role === 'relay_partner') {
      scanner_type = 'relay';
    } else if (req.user!.role === 'transporter') {
      scanner_type = 'transporter';
    } else if (req.user!.role === 'admin' || req.user!.role === 'support' || req.user!.role === 'support_supervisor') {
      scanner_type = 'hub';
    }

    const bypassScanner = processScanBypassFromRole(req.user!.role);

    // Use user ID as scanner_id if not provided
    const final_scanner_id = scanner_id || req.user!.id;

    // Parse timestamp if provided, otherwise use now
    let scan_timestamp: Date;
    if (timestamp) {
      scan_timestamp = new Date(timestamp);
      if (isNaN(scan_timestamp.getTime())) {
        return res.status(400).json({ error: 'Format de timestamp invalide. Utilisez ISO 8601 (ex: 2025-11-04T10:25:00Z)' });
      }
    } else {
      scan_timestamp = new Date();
    }

    // Call the database function to process the scan
    const result = await pool.query(
      'SELECT process_shipment_scan($1, $2, $3, $4, $5, $6, $7, $8) as scan_result',
      [
        tracking_number,
        status,
        location_id || null,
        final_scanner_id,
        scanner_type,
        scan_timestamp,
        notes || null,
        bypassScanner,
      ]
    );

    const scanResult = result.rows[0].scan_result;

    if (!scanResult.success) {
      return res.status(400).json({
        error: scanResult.error || 'Erreur lors du traitement du scan',
        details: scanResult
      });
    }

    res.json({
      success: true,
      message: scanResult.message,
      data: {
        tracking_number: scanResult.tracking_number,
        previous_status: scanResult.previous_status,
        new_status: scanResult.new_status,
        shipment_id: scanResult.shipment_id,
        timestamp: scan_timestamp.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur lors du traitement du scan' });
  }
});

/**
 * GET /api/scan/tracking/:tracking_number
 * Get tracking history for a shipment
 */
router.get('/tracking/:tracking_number', authenticate, async (req: AuthRequest, res) => {
  try {
    const { tracking_number } = req.params;

    // Check if user has access to this shipment
    const shipmentCheck = await pool.query(
      'SELECT id, current_status FROM shipments WHERE tracking_number = $1',
      [tracking_number]
    );

    if (shipmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentCheck.rows[0];

    // Non-admins can only see their own shipments
    if (req.user!.role !== 'admin') {
      if (req.user!.role === 'relay_partner') {
        const relayCheck = await pool.query(
          `SELECT relay_point_id FROM users WHERE id = $1`,
          [req.user!.id]
        );
        const relayId = relayCheck.rows[0]?.relay_point_id;
        
        const accessCheck = await pool.query(
          `SELECT id FROM shipments 
           WHERE tracking_number = $1 
           AND (origin_relay_id = $2 OR destination_relay_id = $2)`,
          [tracking_number, relayId]
        );
        
        if (accessCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Accès non autorisé à ce colis' });
        }
      } else {
        // Regular users can only see their own shipments
        const userShipmentCheck = await pool.query(
          'SELECT id FROM shipments WHERE tracking_number = $1 AND sender_email = $2',
          [tracking_number, req.user!.email]
        );
        
        if (userShipmentCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Accès non autorisé à ce colis' });
        }
      }
    }

    // Get tracking events
    const result = await pool.query(
      `SELECT 
        id,
        status,
        location_id,
        scanner_id,
        scanner_type,
        notes,
        timestamp,
        created_at
      FROM tracking_events
      WHERE tracking_number = $1
      ORDER BY timestamp ASC`,
      [tracking_number]
    );

    res.json({
      tracking_number,
      current_status: shipment.current_status,
      events: result.rows.map(event => ({
        status: event.status,
        location: event.location_id,
        scanner_id: event.scanner_id,
        scanner_type: event.scanner_type,
        notes: event.notes,
        timestamp: event.timestamp,
        created_at: event.created_at
      }))
    });
  } catch (error: any) {
    console.error('Get tracking history error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération de l\'historique' });
  }
});

/**
 * GET /api/scan/events/:shipment_id
 * Get all tracking events for a shipment (by ID)
 */
router.get('/events/:shipment_id', authenticate, requireRole('admin', 'relay_partner', 'transporter'), async (req: AuthRequest, res) => {
  try {
    const { shipment_id } = req.params;

    const result = await pool.query(
      `SELECT 
        te.id,
        te.tracking_number,
        te.status,
        te.location_id,
        te.scanner_id,
        te.scanner_type,
        te.notes,
        te.timestamp,
        te.created_at,
        u.email as scanner_email
      FROM tracking_events te
      LEFT JOIN users u ON u.id::text = te.scanner_id
      WHERE te.shipment_id = $1
      ORDER BY te.timestamp ASC`,
      [shipment_id]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get tracking events error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des événements' });
  }
});

export default router;

/**
 * Additional convenience endpoints for explicit scan intents
 * They all proxy to process_shipment_scan with the appropriate new status
 */
export const scanExtrasRouter = express.Router();

// Helper to get relay id for current user
async function getUserRelayId(userId: string) {
  const r = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.relay_point_id || null;
}

// Relay intake at origin: READY_FOR_DROP_OFF -> RELAY_ORIGIN_RECEIVED
scanExtrasRouter.post('/relay-intake', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, timestamp } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });
    
    const relayId = await getUserRelayId(req.user!.id);
    if (!relayId) {
      return res.status(403).json({ error: 'Vous devez être associé à un point relais pour réceptionner un colis.' });
    }

    // Vérifier que le colis existe
    const shipmentCheck = await pool.query(
      'SELECT id, current_status, origin_relay_id, destination_relay_id, payment_method, payment_status FROM shipments WHERE tracking_number = $1',
      [tracking_number]
    );

    if (shipmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable avec ce numéro de suivi' });
    }

    const shipment = shipmentCheck.rows[0];
    const currentStatus = shipment.current_status;
    const pm = (shipment.payment_method || '').toLowerCase();

    // Un relais de destination ne peut pas être le relais de dépôt du même colis
    if (shipment.destination_relay_id && relayId === shipment.destination_relay_id) {
      return res.status(400).json({ error: 'Ce relais est le point de livraison de ce colis. Le dépôt doit être effectué dans un autre point relais.' });
    }

    // Si le colis est déjà dans le statut RELAY_ORIGIN_RECEIVED, on ne fait rien
    if (currentStatus === 'RELAY_ORIGIN_RECEIVED') {
      return res.json({
        new_status: 'RELAY_ORIGIN_RECEIVED',
        success: true,
        message: 'Colis déjà réceptionné'
      });
    }

    // Vérifier le paiement : pour mobile_money/en ligne, le paiement doit être confirmé avant le dépôt
    if (pm !== 'relay_cash' && (shipment.payment_status || '').toLowerCase() !== 'paid') {
      return res.status(400).json({
        error: 'Le paiement n\'est pas encore confirmé. Le client doit d\'abord valider son paiement avant de déposer le colis.',
      });
    }

    // Si origin_relay_id est null et que le statut est READY_FOR_DROP_OFF,
    // on permet la réception et on associe automatiquement le colis à ce point relais
    if (shipment.origin_relay_id === null && currentStatus === 'READY_FOR_DROP_OFF') {
      // Mettre à jour origin_relay_id avec le relayId du point relais qui réceptionne
      await pool.query(
        'UPDATE shipments SET origin_relay_id = $1 WHERE tracking_number = $2',
        [relayId, tracking_number]
      );
      // Déclencher l'assignation automatique maintenant que origin_relay_id est défini
      try {
        await pool.query('SELECT assign_shipment_to_transporter($1)', [shipment.id]);
      } catch (assignErr: any) {
        console.error('Auto-assignment after relay-intake failed (non-bloquant):', assignErr.message);
      }
    } else if (shipment.origin_relay_id !== relayId && shipment.destination_relay_id !== relayId) {
      // Vérifier que le colis est lié à ce point relais (sauf si c'est la première réception)
      return res.status(403).json({ error: 'Ce colis n\'est pas lié à votre point relais' });
    }

    // Vérifier que le statut actuel permet la transition vers RELAY_ORIGIN_RECEIVED
    if (currentStatus !== 'READY_FOR_DROP_OFF') {
      return res.status(400).json({ 
        error: `Transition impossible : le colis est déjà dans le statut ${currentStatus || 'inconnu'}` 
      });
    }

    const result = await pool.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'RELAY_ORIGIN_RECEIVED', relayId, req.user!.id, 'relay', timestamp || new Date(), null, processScanBypassFromRole(req.user!.role)]
    );
    const r = result.rows[0].r;
    if (!r.success) return res.status(400).json({ error: r.error || 'Erreur lors de la réception du colis' });
    res.json({ new_status: r.new_status, success: true });
  } catch (e: any) {
    console.error('Relay intake error:', e);
    res.status(500).json({ error: e.message || 'Erreur serveur lors de la réception du colis' });
  }
});

// Carrier pickup at origin: RELAY_ORIGIN_RECEIVED -> CARRIER_COLLECTED -> IN_TRANSIT (atomic)
scanExtrasRouter.post('/carrier-pickup', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { tracking_number, relay_id, timestamp } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });

    const pickupTimestamp = timestamp ? new Date(timestamp) : new Date();
    const bypass = processScanBypassFromRole(req.user!.role);

    await client.query('BEGIN');

    const pickupResult = await client.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'CARRIER_COLLECTED', relay_id || null, req.user!.id, 'transporter', pickupTimestamp, null, bypass]
    );
    const pickupScan = pickupResult.rows[0].r;
    if (!pickupScan.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: pickupScan.error });
    }

    const transitResult = await client.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'IN_TRANSIT', null, req.user!.id, 'transporter', pickupTimestamp, null, bypass]
    );
    const transitScan = transitResult.rows[0].r;
    if (!transitScan.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: transitScan.error });
    }

    const transporterResult = await client.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
    const transporterId = transporterResult.rows[0]?.id;
    if (transporterId && transitScan.shipment_id) {
      await client.query(
        `INSERT INTO transporter_assignments (transporter_id, shipment_id, relay_point_id, assignment_status, picked_up_at)
         VALUES ($1, $2, $3, 'in_transit', $4)
         ON CONFLICT (transporter_id, shipment_id)
         DO UPDATE SET
           assignment_status = 'in_transit',
           picked_up_at = EXCLUDED.picked_up_at,
           relay_point_id = COALESCE(EXCLUDED.relay_point_id, transporter_assignments.relay_point_id),
           updated_at = NOW()`,
        [transporterId, transitScan.shipment_id, relay_id || null, pickupTimestamp]
      );
    }

    await client.query('COMMIT');
    res.json({ new_status: transitScan.new_status });
  } catch (e: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Confirmation du ramassage à domicile: PICKUP_PENDING -> CARRIER_COLLECTED -> IN_TRANSIT (atomic)
scanExtrasRouter.post('/confirm-home-pickup', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { tracking_number, timestamp } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });

    const pickupTimestamp = timestamp ? new Date(timestamp) : new Date();

    const shipmentCheck = await client.query(
      `SELECT id, current_status, pickup_method, origin_relay_id, destination_relay_id
       FROM shipments WHERE tracking_number = $1`,
      [tracking_number]
    );
    if (shipmentCheck.rows.length === 0) return res.status(404).json({ error: 'Colis introuvable' });

    const shipment = shipmentCheck.rows[0];
    const currentStatus = (shipment.current_status || '').toUpperCase();
    const isHomePickup = !shipment.origin_relay_id;
    const isPickupPending = currentStatus === 'PICKUP_PENDING' || (isHomePickup && currentStatus === 'READY_FOR_DROP_OFF');

    if (!isPickupPending) {
      return res.status(400).json({
        error: `Ce colis n'est pas en attente de ramassage à domicile (statut : ${currentStatus})`
      });
    }

    await client.query('BEGIN');

    const pickupResult = await client.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'CARRIER_COLLECTED', null, req.user!.id, 'transporter', pickupTimestamp, 'Ramassage à domicile confirmé', true]
    );
    const pickupScan = pickupResult.rows[0].r;
    if (!pickupScan.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: pickupScan.error });
    }

    const transitResult = await client.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'IN_TRANSIT', shipment.destination_relay_id || null, req.user!.id, 'transporter', pickupTimestamp, null, true]
    );
    const transitScan = transitResult.rows[0].r;
    if (!transitScan.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: transitScan.error });
    }

    const transporterResult = await client.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
    const transporterId = transporterResult.rows[0]?.id;
    if (transporterId && transitScan.shipment_id) {
      await client.query(
        `INSERT INTO transporter_assignments (transporter_id, shipment_id, relay_point_id, assignment_status, picked_up_at)
         VALUES ($1, $2, $3, 'in_transit', $4)
         ON CONFLICT (transporter_id, shipment_id)
         DO UPDATE SET assignment_status = 'in_transit', picked_up_at = EXCLUDED.picked_up_at, updated_at = NOW()`,
        [transporterId, transitScan.shipment_id, shipment.destination_relay_id || null, pickupTimestamp]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, new_status: 'IN_TRANSIT' });
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('confirm-home-pickup error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Departure: CARRIER_COLLECTED -> IN_TRANSIT
scanExtrasRouter.post('/ops/departure', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, timestamp } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });
    const result = await pool.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'IN_TRANSIT', null, req.user!.id, 'transporter', timestamp || new Date(), null, processScanBypassFromRole(req.user!.role)]
    );
    const r = result.rows[0].r;
    if (!r.success) return res.status(400).json({ error: r.error });
    res.json({ new_status: r.new_status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Relay final intake: IN_TRANSIT -> RELAY_FINAL_RECEIVED
scanExtrasRouter.post('/relay-final-intake', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, timestamp } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });
    const relayId = await getUserRelayId(req.user!.id);

    const shipmentResult = await pool.query(
      `SELECT s.id,
              s.payment_method,
              s.payment_status,
              s.destination_relay_id,
              s.current_status
       FROM shipments s
       WHERE s.tracking_number = $1`,
      [tracking_number]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];
    const pm = (shipment.payment_method || '').toLowerCase();

    if (pm !== 'relay_cash' && (shipment.payment_status || '').toLowerCase() !== 'paid') {
      return res.status(400).json({
        error: 'Le paiement n\'est pas encore confirmé. Le colis ne peut pas être réceptionné pour le moment.',
      });
    }

    // Si le transporteur n'a pas enregistré son départ, on passe d'abord par IN_TRANSIT
    if (shipment.current_status === 'CARRIER_COLLECTED') {
      const transitResult = await pool.query(
        'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
        [tracking_number, 'IN_TRANSIT', relayId, req.user!.id, 'relay', timestamp || new Date(), null, true]
      );
      const tr = transitResult.rows[0].r;
      if (!tr.success) return res.status(400).json({ error: tr.error });
    }

    const result = await pool.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'RELAY_FINAL_RECEIVED', relayId, req.user!.id, 'relay', timestamp || new Date(), null, processScanBypassFromRole(req.user!.role)]
    );
    const r = result.rows[0].r;
    if (!r.success) return res.status(400).json({ error: r.error });
    res.json({ new_status: r.new_status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Make available at final relay: RELAY_FINAL_RECEIVED -> AVAILABLE_FOR_PICKUP
scanExtrasRouter.post('/ops/make-available', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, timestamp } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });
    const relayId = await getUserRelayId(req.user!.id);

    const shipmentResult = await pool.query(
      `SELECT s.id,
              s.payment_method,
              s.payment_status,
              s.destination_relay_id,
              s.current_status
       FROM shipments s
       WHERE s.tracking_number = $1`,
      [tracking_number]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];
    const pm = (shipment.payment_method || '').toLowerCase();

    if (pm !== 'relay_cash' && (shipment.payment_status || '').toLowerCase() !== 'paid') {
      return res.status(400).json({
        error: 'Le paiement n\'est pas encore confirmé. Le colis ne peut pas être mis à disposition pour le moment.',
      });
    }

    const result = await pool.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [tracking_number, 'AVAILABLE_FOR_PICKUP', relayId, req.user!.id, 'relay', timestamp || new Date(), null, processScanBypassFromRole(req.user!.role)]
    );
    const r = result.rows[0].r;
    if (!r.success) return res.status(400).json({ error: r.error });
    res.json({ new_status: r.new_status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Deliver to customer at relay: AVAILABLE_FOR_PICKUP -> PICKED_UP_BY_CUSTOMER
scanExtrasRouter.post('/relay/complete-delivery', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, timestamp, pickup_code, recipient_identifier } = req.body;
    if (!tracking_number) return res.status(400).json({ error: 'tracking_number est requis' });
    if (!pickup_code || typeof pickup_code !== 'string') {
      return res.status(400).json({ error: 'pickup_code est requis' });
    }

    const relayId = await getUserRelayId(req.user!.id);
    if (!relayId) {
      return res.status(403).json({ error: 'Vous devez être associé à un point relais pour valider un retrait.' });
    }

    const shipmentResult = await pool.query(
      `SELECT id, pickup_code, destination_relay_id, home_delivery, recipient_phone, recipient_email, current_status,
              payment_method, payment_status
       FROM shipments
       WHERE tracking_number = $1`,
      [tracking_number]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];

    if (shipment.destination_relay_id !== relayId) {
      return res.status(403).json({ error: 'Ce colis n\'est pas rattaché à votre point relais.' });
    }

    if (shipment.home_delivery) {
      return res.status(400).json({ error: 'Ce colis est prévu pour une livraison à domicile.' });
    }

    const normalizedStatus = (shipment.current_status || '').toUpperCase();
    if (normalizedStatus !== 'AVAILABLE_FOR_PICKUP') {
      return res.status(400).json({ error: 'Le colis n\'est pas disponible pour retrait.' });
    }

    const pm = (shipment.payment_method || '').toLowerCase();
    if (pm !== 'relay_cash' && (shipment.payment_status || '').toLowerCase() !== 'paid') {
      return res.status(400).json({ error: 'Le paiement n\'est pas encore confirmé. Le colis ne peut pas être retiré.' });
    }

    if ((shipment.pickup_code || '').trim() !== pickup_code.trim()) {
      return res.status(400).json({ error: 'Code de retrait invalide.' });
    }

    if (recipient_identifier) {
      const identifier = recipient_identifier.toString().trim();
      const matchesPhone = shipment.recipient_phone && shipment.recipient_phone.trim() === identifier;
      const matchesEmail = shipment.recipient_email && shipment.recipient_email.trim().toLowerCase() === identifier.toLowerCase();
      if (!matchesPhone && !matchesEmail) {
        return res.status(400).json({ error: 'Identifiant destinataire invalide.' });
      }
    }

    const scanTimestamp = timestamp ? new Date(timestamp) : new Date();

    const result = await pool.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [
        tracking_number,
        'PICKED_UP_BY_CUSTOMER',
        relayId,
        req.user!.id,
        'relay',
        scanTimestamp,
        'Retrait confirmé avec code de sécurité',
        processScanBypassFromRole(req.user!.role),
      ]
    );
    const r = result.rows[0].r;
    if (!r.success) return res.status(400).json({ error: r.error });

    await pool.query(
      `UPDATE shipments
       SET pickup_code_verified_at = NOW(),
           pickup_code_verified_by = $1
       WHERE id = $2`,
      [req.user!.id, shipment.id]
    );

    res.json({ new_status: r.new_status });
  } catch (e: any) {
    console.error('Relay complete delivery error:', e);
    res.status(500).json({ error: e.message });
  }
});


