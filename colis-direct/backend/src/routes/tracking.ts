import express from 'express';
import { pool } from '../db/connection';

  const router = express.Router();

// Get tracking by tracking number, pickup code, or shipment code
router.get('/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const normalizedInput = trackingNumber.trim().toUpperCase();
    
    // Détecter le type de code :
    // - 6 chiffres : pickup_code (code de retrait secret)
    // - 4 chiffres + 2 lettres : shipment_code (numéro d'envoi)
    // - Autre : tracking_number
    const isPickupCode = /^[0-9]{6}$/.test(normalizedInput);
    const isShipmentCode = /^[0-9]{4}[A-Z]{2}$/.test(normalizedInput);
    
    let whereClause: string;
    let searchValue: string;
    
    if (isPickupCode) {
      whereClause = 's.pickup_code = $1';
      searchValue = normalizedInput;
    } else if (isShipmentCode) {
      whereClause = 's.shipment_code = $1';
      searchValue = normalizedInput;
    } else {
      whereClause = 's.tracking_number = $1';
      searchValue = normalizedInput;
    }

    const shipmentResult = await pool.query(
      `SELECT s.*,
              row_to_json(mmp.*) AS mobile_money_payment,
              row_to_json(rcp.*) AS relay_cash_payment,
              shipment_effective_status(s.current_status::text, s.payment_method, s.payment_status, COALESCE(mmp.status::text, ''), COALESCE(rcp.status::text, '')) AS effective_status,
              o.name as origin_name, o.commune as origin_commune, o.quartier as origin_quartier,
              o.address as origin_address, o.phone as origin_phone, o.hours as origin_hours,
              d.name as destination_name, d.commune as destination_commune, d.quartier as destination_quartier,
              d.address as destination_address, d.phone as destination_phone, d.hours as destination_hours
       FROM shipments s
       LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
       LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
       LEFT JOIN relay_points o ON s.origin_relay_id = o.id
       LEFT JOIN relay_points d ON s.destination_relay_id = d.id
       WHERE ${whereClause}`,
      [searchValue]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const shipment = shipmentResult.rows[0];

    // Get tracking events (canonical)
    const eventsResult = await pool.query(
      `SELECT status, location_id, scanner_type, scanner_id, notes, timestamp, created_at
       FROM tracking_events
       WHERE shipment_id = $1
       ORDER BY timestamp ASC`,
      [shipment.id]
    );

    res.json({
      ...shipment,
      origin_relay: shipment.origin_name ? {
        name: shipment.origin_name,
        commune: shipment.origin_commune,
        quartier: shipment.origin_quartier,
        address: shipment.origin_address,
        phone: shipment.origin_phone,
        hours: shipment.origin_hours,
      } : null,
      destination_relay: shipment.destination_name ? {
        name: shipment.destination_name,
        commune: shipment.destination_commune,
        quartier: shipment.destination_quartier,
        address: shipment.destination_address,
        phone: shipment.destination_phone,
        hours: shipment.destination_hours,
      } : null,
      // Renvoyer le current_status stocké (ne plus le forcer à l'état effectif)
      current_status: shipment.current_status,
      payment_status: shipment.payment_status,
      events: eventsResult.rows,
    });
  } catch (error: any) {
    console.error('Get tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Statut de la recherche de livreur (style Uber) pour un colis home_pickup.
// Accès par tracking_number (identifiant secret remis à l'expéditeur, comme le tracking public).
// États : 'not_applicable' | 'searching' | 'assigned' | 'no_driver'
router.get('/:trackingNumber/dispatch-status', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipmentRes = await pool.query(
      `SELECT id, pickup_method, transporter_id, payment_status,
              sender_latitude, sender_longitude
       FROM shipments WHERE tracking_number = $1`,
      [trackingNumber.trim().toUpperCase()]
    );
    if (shipmentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Colis non trouvé' });
    }
    const s = shipmentRes.rows[0];

    if (s.pickup_method !== 'home_pickup') {
      return res.json({ state: 'not_applicable' });
    }

    const pickup = {
      latitude: s.sender_latitude !== null ? Number(s.sender_latitude) : null,
      longitude: s.sender_longitude !== null ? Number(s.sender_longitude) : null,
    };

    // Livreur assigné → renvoyer ses infos (nom, tél, véhicule, position live)
    if (s.transporter_id) {
      const tRes = await pool.query(
        `SELECT t.id, t.vehicle_type, t.license_plate, t.transporter_code,
                t.current_latitude, t.current_longitude, t.location_updated_at,
                u.first_name, u.last_name, u.phone
         FROM transporters t
         JOIN users u ON u.id = t.user_id
         WHERE t.id = $1`,
        [s.transporter_id]
      );
      const t = tRes.rows[0];
      return res.json({
        state: 'assigned',
        pickup,
        driver: t
          ? {
              first_name: t.first_name,
              last_name: t.last_name,
              phone: t.phone,
              vehicle_type: t.vehicle_type,
              license_plate: t.license_plate,
              transporter_code: t.transporter_code,
              latitude: t.current_latitude !== null ? Number(t.current_latitude) : null,
              longitude: t.current_longitude !== null ? Number(t.current_longitude) : null,
              location_updated_at: t.location_updated_at,
            }
          : null,
      });
    }

    // Pas encore de livreur : recherche en cours s'il y a eu des offres,
    // sinon dépend de l'état du paiement (dispatch peut-être pas encore lancé).
    const offersRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*)::int                                    AS total,
         MAX(offer_round)                                 AS last_round
       FROM delivery_offers WHERE shipment_id = $1`,
      [s.id]
    );
    const o = offersRes.rows[0];
    if (o.total > 0) {
      return res.json({
        state: 'searching',
        pickup,
        offers_sent: o.total,
        pending_offers: o.pending,
        round: o.last_round,
      });
    }
    return res.json({
      state: s.payment_status === 'paid' ? 'no_driver' : 'searching',
      pickup,
      offers_sent: 0,
    });
  } catch (error: any) {
    console.error('Dispatch status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

