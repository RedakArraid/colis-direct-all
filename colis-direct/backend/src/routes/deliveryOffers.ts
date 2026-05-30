import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import dispatchService from '../services/dispatchService';

const router = express.Router();

// GET /api/delivery-offers/my-offers — Offres en attente pour le livreur connecté
router.get('/my-offers', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    // Marquer les offres expirées avant de récupérer la liste
    await pool.query(
      `UPDATE delivery_offers
       SET status = 'expired'
       WHERE transporter_id = $1 AND status = 'pending' AND expires_at < NOW()`,
      [transporterId]
    );

    const result = await pool.query(
      `SELECT
          o.*,
          s.tracking_number,
          s.sender_first_name, s.sender_last_name,
          s.sender_commune, s.sender_address,
          s.recipient_first_name, s.recipient_last_name,
          s.recipient_commune, s.recipient_address,
          s.package_type, s.weight, s.home_delivery,
          s.pickup_method,
          s.price,
          rp_origin.name  AS origin_relay_name,
          rp_origin.address AS origin_relay_address,
          rp_origin.commune AS origin_relay_commune,
          rp_dest.name    AS destination_relay_name,
          rp_dest.address AS destination_relay_address,
          rp_dest.commune AS destination_relay_commune
       FROM delivery_offers o
       JOIN shipments s ON s.id = o.shipment_id
       LEFT JOIN relay_points rp_origin ON rp_origin.id = s.origin_relay_id
       LEFT JOIN relay_points rp_dest   ON rp_dest.id   = s.destination_relay_id
       WHERE o.transporter_id = $1 AND o.status = 'pending'
       ORDER BY o.offered_at DESC`,
      [transporterId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my offers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-offers/:offerId/accept — Livreur accepte la course
router.post('/:offerId/accept', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { offerId } = req.params;

    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    // Vérifier que l'offre existe et appartient à ce livreur
    const offerRes = await pool.query(
      'SELECT * FROM delivery_offers WHERE id = $1 AND transporter_id = $2',
      [offerId, transporterId]
    );
    if (offerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée' });
    }

    const offer = offerRes.rows[0];

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `Cette offre n'est plus disponible (statut: ${offer.status})` });
    }
    if (new Date(offer.expires_at) < new Date()) {
      await pool.query(`UPDATE delivery_offers SET status = 'expired' WHERE id = $1`, [offerId]);
      return res.status(400).json({ error: 'Cette offre a expiré' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Accepter cette offre
      await client.query(
        `UPDATE delivery_offers
         SET status = 'accepted', responded_at = NOW()
         WHERE id = $1`,
        [offerId]
      );

      // Annuler les autres offres pour ce colis
      await client.query(
        `UPDATE delivery_offers
         SET status = 'cancelled', responded_at = NOW()
         WHERE shipment_id = $1 AND id != $2 AND status = 'pending'`,
        [offer.shipment_id, offerId]
      );

      // Assigner le livreur au colis SANS changer le statut logistique.
      // Le colis n'est pas encore collecté physiquement : il reste READY_FOR_DROP_OFF /
      // PICKUP_PENDING / RELAY_ORIGIN_RECEIVED jusqu'à la collecte réelle, qui passera
      // CARRIER_COLLECTED via process_shipment_scan (avec vérification du paiement).
      await client.query(
        `UPDATE shipments
         SET transporter_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [transporterId, offer.shipment_id]
      );

      // Créer l'entrée d'assignation (en attente de collecte)
      await client.query(
        `INSERT INTO transporter_assignments (transporter_id, shipment_id, assignment_status, expected_pickup_at)
         VALUES ($1, $2, 'pending', NOW() + INTERVAL '2 hours')
         ON CONFLICT (transporter_id, shipment_id) DO UPDATE
           SET assignment_status = 'pending', expected_pickup_at = NOW() + INTERVAL '2 hours'`,
        [transporterId, offer.shipment_id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Course acceptée avec succès',
        shipment_id: offer.shipment_id,
        net_earnings_fcfa: offer.net_earnings_fcfa,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Accept offer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-offers/:offerId/decline — Livreur refuse la course
router.post('/:offerId/decline', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { offerId } = req.params;

    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    const offerRes = await pool.query(
      'SELECT * FROM delivery_offers WHERE id = $1 AND transporter_id = $2 AND status = $3',
      [offerId, transporterId, 'pending']
    );
    if (offerRes.rows.length === 0) {
      return res.status(404).json({ error: "Offre non trouvée ou plus disponible" });
    }

    await pool.query(
      `UPDATE delivery_offers SET status = 'declined', responded_at = NOW() WHERE id = $1`,
      [offerId]
    );

    // Déclencher le dispatch vers le prochain livreur (non-bloquant)
    dispatchService.continueDispatch(offerRes.rows[0].shipment_id, offerRes.rows[0].offer_round + 1)
      .catch((err) => console.error('Continue dispatch error:', err));

    res.json({ success: true, message: 'Course déclinée' });
  } catch (error: any) {
    console.error('Decline offer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-offers/dispatch/:shipmentId — Lancer le dispatch (admin ou auto)
router.post('/dispatch/:shipmentId', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { shipmentId } = req.params;
    await dispatchService.dispatchShipment(shipmentId);
    res.json({ success: true, message: 'Dispatch lancé' });
  } catch (error: any) {
    console.error('Manual dispatch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery-offers/admin/pending — Colis sans livreur disponibles (admin)
router.get('/admin/pending', authenticate, requireRole('admin', 'support'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT
          s.id, s.tracking_number, s.sender_commune, s.recipient_commune,
          s.package_type, s.weight, s.price, s.home_delivery, s.pickup_method,
          s.current_status, s.created_at,
          MAX(o.offer_round) AS last_round,
          COUNT(o.id) AS total_offers_sent,
          COUNT(CASE WHEN o.status = 'declined' THEN 1 END) AS declined_count
       FROM shipments s
       LEFT JOIN delivery_offers o ON o.shipment_id = s.id
       WHERE s.current_status IN ('READY_FOR_DROP_OFF', 'PICKUP_PENDING', 'RELAY_ORIGIN_RECEIVED')
         AND s.transporter_id IS NULL
       GROUP BY s.id
       ORDER BY s.created_at ASC`,
      []
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Admin pending dispatch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
