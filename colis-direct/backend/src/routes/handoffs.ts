import express from 'express';
import { pool } from '../db/connection';
import { processScanBypassFromRole } from '../lib/processScanBypass';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import dispatchService from '../services/dispatchService';

const router = express.Router();

async function insertHandoffTrackingEvent(
  shipmentId: string,
  trackingNumber: string,
  status: string,
  locationId: string | null,
  scannerId: string,
  scannerType: string,
  notes: string | null
) {
  await pool.query(
    `INSERT INTO tracking_events (
       shipment_id, tracking_number, status, location_id, scanner_id, scanner_type, notes, "timestamp"
     ) VALUES ($1, $2, $3::shipment_status, $4, $5, $6, $7, NOW())`,
    [shipmentId, trackingNumber, status, locationId, scannerId, scannerType, notes]
  );
}

async function assertPaymentReadyForRelayHandoff(shipment: { id: string; payment_method: string | null; payment_status: string | null }): Promise<string | null> {
  const pm = (shipment.payment_method || '').toLowerCase();
  if (pm === 'relay_cash') {
    return null;
  }
  if ((shipment.payment_status || '').toLowerCase() !== 'paid') {
    return "Le paiement n'est pas encore confirmé.";
  }
  return null;
}

// Scan shipment for handoff (relay to transporter or vice versa)
router.post('/scan', authenticate, requireRole('relay_partner', 'transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, target_relay_id, target_transporter_id } = req.body;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    // Get shipment
    const shipmentResult = await pool.query(
      'SELECT * FROM shipments WHERE tracking_number = $1',
      [tracking_number]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis non trouvé' });
    }

    const shipment = shipmentResult.rows[0];
    let fromType: 'relay' | 'transporter';
    let fromId: string;
    let toType: 'relay' | 'transporter';
    let toId: string;
    let handoffType: 'relay_to_transporter' | 'transporter_to_relay' | 'transporter_to_destination';
    let newStatus: string;
    let transporterId: string | null = null;

    if (userRole === 'relay_partner') {
      // Relay scanning - giving to transporter
      fromType = 'relay';
      const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [userId]);
      fromId = relayResult.rows[0]?.relay_point_id;

      if (!target_transporter_id) {
        return res.status(400).json({ error: 'ID transporteur requis' });
      }

      const payErr = await assertPaymentReadyForRelayHandoff(shipment);
      if (payErr) {
        return res.status(400).json({ error: payErr });
      }

      toType = 'transporter';
      toId = target_transporter_id;
      handoffType = 'relay_to_transporter';
      newStatus = 'IN_TRANSIT';
      transporterId = target_transporter_id;

      // Update shipment
      await pool.query(
        'UPDATE shipments SET current_status = $1, transporter_id = $2, updated_at = NOW(), updated_by = $3 WHERE id = $4',
        [newStatus, transporterId, userId, shipment.id]
      );

      await insertHandoffTrackingEvent(
        shipment.id,
        shipment.tracking_number,
        newStatus,
        fromId ? String(fromId) : null,
        userId,
        'relay',
        `Handoff relais → transporteur (relay_to_transporter)`
      );

      // Create or update transporter assignment
      await pool.query(
        `INSERT INTO transporter_assignments (transporter_id, shipment_id, relay_point_id, assignment_status, picked_up_at)
         VALUES ($1, $2, $3, 'picked_up', NOW())
         ON CONFLICT (transporter_id, shipment_id) 
         DO UPDATE SET assignment_status = 'picked_up', picked_up_at = NOW()`,
        [target_transporter_id, shipment.id, fromId]
      );
    } else if (userRole === 'transporter') {
      // Transporter scanning - giving to relay or delivering to home
      fromType = 'transporter';
      const transporterResult = await pool.query('SELECT id FROM transporters WHERE user_id = $1', [userId]);
      const transporterIdFromUser = transporterResult.rows[0]?.id;
      fromId = transporterIdFromUser;

      if (shipment.home_delivery && !target_relay_id) {
        toType = 'transporter';
        toId = transporterIdFromUser;
        handoffType = 'transporter_to_destination';

        const scan = await pool.query(
          `SELECT process_shipment_scan($1, 'DELIVERED_TO_CUSTOMER'::shipment_status, NULL, $2::text, 'transporter', NOW(), $3, $4) AS r`,
          [tracking_number, userId, 'Livraison à domicile (handoff)', processScanBypassFromRole(userRole)]
        );
        const r = scan.rows[0]?.r;
        if (!r?.success) {
          return res.status(400).json({ error: r?.error || 'Transition refusée' });
        }
        newStatus = 'DELIVERED_TO_CUSTOMER';

        await pool.query(`UPDATE shipments SET updated_by = $1, transporter_id = NULL WHERE id = $2`, [userId, shipment.id]);

        await pool.query(
          `UPDATE transporter_assignments 
           SET assignment_status = 'delivered', updated_at = NOW()
           WHERE transporter_id = $1 AND shipment_id = $2`,
          [transporterIdFromUser, shipment.id]
        );

        await pool.query(
          `INSERT INTO shipment_handoffs (
            shipment_id, from_type, from_id, to_type, to_id, scanned_by_user_id, handoff_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [shipment.id, fromType, fromId, toType, toId, userId, handoffType]
        );

        await pool.query(
          'INSERT INTO shipment_tracking (shipment_id, status, location, notes, updated_by) VALUES ($1, $2, $3, $4, $5)',
          [shipment.id, newStatus, `Transféré de ${fromType} vers ${toType}`, `Scanné par utilisateur ${req.user!.email}`, userId]
        );

        const refreshed = await pool.query('SELECT * FROM shipments WHERE id = $1', [shipment.id]);

        // Crédit automatique du portefeuille livreur (non-bloquant)
        if (transporterIdFromUser) {
          dispatchService.creditTransporterWallet(shipment.id, transporterIdFromUser)
            .catch((err) => console.error('Wallet credit error (home delivery):', err));
        }

        return res.json({
          success: true,
          shipment: {
            ...refreshed.rows[0],
            current_status: newStatus,
            status: newStatus,
            transporter_id: null,
          },
          message: 'Colis livré',
        });
      }

      if (!target_relay_id) {
        return res.status(400).json({ error: 'ID point relais requis' });
      }

      toType = 'relay';
      toId = target_relay_id;
      handoffType = 'transporter_to_relay';
      newStatus = 'RELAY_FINAL_RECEIVED';
      transporterId = null;

      await pool.query(
        'UPDATE shipments SET current_status = $1, transporter_id = NULL, updated_at = NOW(), updated_by = $2 WHERE id = $3',
        [newStatus, userId, shipment.id]
      );

      await insertHandoffTrackingEvent(
        shipment.id,
        shipment.tracking_number,
        newStatus,
        String(target_relay_id),
        userId,
        'transporter',
        `Handoff transporteur → relais final`
      );

      await pool.query(
        `UPDATE transporter_assignments 
         SET assignment_status = 'delivered', updated_at = NOW()
         WHERE transporter_id = $1 AND shipment_id = $2`,
        [transporterIdFromUser, shipment.id]
      );
    } else {
      return res.status(403).json({ error: 'Rôle non autorisé' });
    }

    // Record handoff
    await pool.query(
      `INSERT INTO shipment_handoffs (
        shipment_id, from_type, from_id, to_type, to_id, scanned_by_user_id, handoff_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [shipment.id, fromType, fromId, toType, toId, userId, handoffType]
    );

    await pool.query(
      'INSERT INTO shipment_tracking (shipment_id, status, location, notes, updated_by) VALUES ($1, $2, $3, $4, $5)',
      [shipment.id, newStatus, `Transféré de ${fromType} vers ${toType}`, `Scanné par utilisateur ${req.user!.email}`, userId]
    );

    const refreshed = await pool.query('SELECT * FROM shipments WHERE id = $1', [shipment.id]);

    // Crédit automatique du portefeuille livreur à la remise au relais final (non-bloquant)
    if (handoffType === 'transporter_to_relay' && fromId) {
      dispatchService.creditTransporterWallet(shipment.id, fromId)
        .catch((err) => console.error('Wallet credit error (relay handoff):', err));
    }

    res.json({
      success: true,
      shipment: {
        ...refreshed.rows[0],
        current_status: newStatus,
        status: newStatus,
        transporter_id: transporterId,
      },
      message: 'Colis transféré avec succès',
    });
  } catch (error: any) {
    console.error('Scan handoff error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Find transporter by identifier (transporter ID, user ID, or user email/phone)
// IMPORTANT: This route must be defined BEFORE any /transporter/:transporterId routes
// to avoid route conflicts (Express matches routes in order)
router.get('/find-transporter/:identifier', authenticate, requireRole('relay_partner', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { identifier } = req.params;
    
    
    // Try to find transporter by different identifiers
    // 1. Try as transporter UUID
    let transporterResult = await pool.query(
      `SELECT t.id, t.user_id 
       FROM transporters t 
       WHERE t.id::text = $1`,
      [identifier]
    );
    
    // 2. If not found, try as user UUID
    if (transporterResult.rows.length === 0) {
      transporterResult = await pool.query(
        `SELECT t.id, t.user_id 
         FROM transporters t 
         JOIN users u ON t.user_id = u.id 
         WHERE u.id::text = $1`,
        [identifier]
      );
    }
    
    // 3. If still not found, try as transporter_code (6-digit identifier)
    if (transporterResult.rows.length === 0 && /^[0-9]{6}$/.test(identifier)) {
      transporterResult = await pool.query(
        `SELECT t.id, t.user_id 
         FROM transporters t 
         WHERE t.transporter_code = $1`,
        [identifier]
      );
      
      // Also try as relay_code if not found as transporter_code
      if (transporterResult.rows.length === 0) {
        const relayResult = await pool.query(
          `SELECT rp.id as relay_id, rp.name as relay_name
           FROM relay_points rp 
           WHERE rp.relay_code = $1`,
          [identifier]
        );
        
        if (relayResult.rows.length > 0) {
          // If it's a relay code, return error suggesting to search for transporters at this relay
          return res.status(400).json({ 
            error: 'Cet identifiant correspond à un point relais. Veuillez rechercher un transporteur par son identifiant de 6 chiffres.',
            relay_id: relayResult.rows[0].relay_id,
            relay_name: relayResult.rows[0].relay_name
          });
        }
      }
    }
    
    // 4. If still not found, try as user email or phone
    if (transporterResult.rows.length === 0) {
      transporterResult = await pool.query(
        `SELECT t.id, t.user_id 
         FROM transporters t 
         JOIN users u ON t.user_id = u.id 
         WHERE u.email = $1 OR u.phone = $1`,
        [identifier]
      );
    }
    
    // 5. If still not found and it's a numeric ID, try to find by partial match in UUIDs
    // This handles cases where the identifier might be part of a UUID
    if (transporterResult.rows.length === 0 && /^[0-9a-fA-F-]+$/.test(identifier)) {
      // Try partial match on UUIDs (for cases where only part of UUID is provided)
      transporterResult = await pool.query(
        `SELECT t.id, t.user_id 
         FROM transporters t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.id::text LIKE $1 OR u.id::text LIKE $1`,
        [`%${identifier}%`]
      );
    }
    
    // 6. If still not found and it's purely numeric (but not 6 digits), try partial match
    if (transporterResult.rows.length === 0 && /^[0-9]+$/.test(identifier) && identifier.length !== 6) {
      // Try to find by matching the identifier as a substring in any UUID field
      transporterResult = await pool.query(
        `SELECT t.id, t.user_id 
         FROM transporters t 
         JOIN users u ON t.user_id = u.id 
         WHERE REPLACE(REPLACE(t.id::text, '-', ''), ' ', '') LIKE $1 
            OR REPLACE(REPLACE(u.id::text, '-', ''), ' ', '') LIKE $1`,
        [`%${identifier}%`]
      );
    }
    
    if (transporterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transporteur non trouvé' });
    }
    
    const transporterId = transporterResult.rows[0].id;
    res.json({ transporter_id: transporterId, user_id: transporterResult.rows[0].user_id });
  } catch (error: any) {
    console.error('Find transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Find relay point by identifier (relay ID, relay_code, or name)
router.get('/find-relay/:identifier', authenticate, requireRole('transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { identifier } = req.params;
    
    
    // Try to find relay by different identifiers
    // 1. Try as relay UUID
    let relayResult = await pool.query(
      `SELECT rp.id, rp.name, rp.relay_code, rp.address, rp.commune
       FROM relay_points rp 
       WHERE rp.id::text = $1`,
      [identifier]
    );
    
    // 2. If not found, try as relay_code (6-digit identifier)
    if (relayResult.rows.length === 0 && /^[0-9]{6}$/.test(identifier)) {
      relayResult = await pool.query(
        `SELECT rp.id, rp.name, rp.relay_code, rp.address, rp.commune
         FROM relay_points rp 
         WHERE rp.relay_code = $1`,
        [identifier]
      );
    }
    
    // 3. If still not found, try as name (partial match)
    if (relayResult.rows.length === 0) {
      relayResult = await pool.query(
        `SELECT rp.id, rp.name, rp.relay_code, rp.address, rp.commune
         FROM relay_points rp 
         WHERE LOWER(rp.name) LIKE LOWER($1) OR LOWER(rp.commune) LIKE LOWER($1)`,
        [`%${identifier}%`]
      );
    }
    
    if (relayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Point relais non trouvé' });
    }
    
    if (relayResult.rows.length > 1) {
      // Multiple matches - return list
      return res.json({ 
        matches: relayResult.rows,
        message: 'Plusieurs points relais trouvés'
      });
    }
    
    res.json({ relay_id: relayResult.rows[0].id, relay_name: relayResult.rows[0].name });
  } catch (error: any) {
    console.error('Find relay error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current transporter profile with code
router.get('/transporter/profile', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterResult = await pool.query(
      `SELECT t.id, t.transporter_code, t.status, t.vehicle_type, t.license_plate,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone
       FROM transporters t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [req.user!.id]
    );
    
    if (transporterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    
    res.json(transporterResult.rows[0]);
  } catch (error: any) {
    console.error('Get transporter profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipments assigned to a transporter
router.get('/transporter/assignments', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterResult = await pool.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
    const transporterId = transporterResult.rows[0]?.id;


    if (!transporterId) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }

    // Récupérer les colis explicitement assignés
    // Exclure les colis Mobile Money sans déclaration (cohérence avec la page client)
    const assignedResult = await pool.query(
      `SELECT 
        s.*,
        ta.assignment_status,
        ta.expected_pickup_at,
        ta.picked_up_at,
        rp.name as relay_name,
        rp.address as relay_address,
        rp.commune as relay_commune,
        rp.latitude as relay_latitude,
        rp.longitude as relay_longitude,
        rp_dest.name as destination_relay_name,
        rp_dest.address as destination_relay_address,
        rp_dest.commune as destination_relay_commune,
        rp_dest.id as destination_relay_id,
        rp_dest.latitude as destination_relay_latitude,
        rp_dest.longitude as destination_relay_longitude,
        rcp.id as relay_cash_payment_id,
        rcp.status as relay_cash_status,
        rcp.amount_expected as relay_cash_amount_expected,
        rcp.amount_collected as relay_cash_amount_collected
       FROM transporter_assignments ta
       JOIN shipments s ON ta.shipment_id = s.id
       LEFT JOIN relay_points rp ON ta.relay_point_id = rp.id
       LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
       LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
       WHERE ta.transporter_id = $1
       ORDER BY ta.created_at DESC`,
      [transporterId]
    );

    // Récupérer aussi les colis dans la zone du transporteur (même non explicitement assignés)
    const zoneResult = await pool.query(
      `SELECT DISTINCT
        s.*,
        'pending' as assignment_status,
        NULL as expected_pickup_at,
        NULL as picked_up_at,
        rp_origin.name as relay_name,
        rp_origin.address as relay_address,
        rp_origin.commune as relay_commune,
        rp_origin.latitude as relay_latitude,
        rp_origin.longitude as relay_longitude,
        rp_dest.name as destination_relay_name,
        rp_dest.address as destination_relay_address,
        rp_dest.commune as destination_relay_commune,
        rp_dest.id as destination_relay_id,
        rp_dest.latitude as destination_relay_latitude,
        rp_dest.longitude as destination_relay_longitude,
        rcp.id as relay_cash_payment_id,
        rcp.status as relay_cash_status,
        rcp.amount_expected as relay_cash_amount_expected,
        rcp.amount_collected as relay_cash_amount_collected
       FROM shipments s
       LEFT JOIN relay_points rp_origin ON s.origin_relay_id = rp_origin.id
       LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
       LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
       JOIN transporter_delivery_zones tdz ON tdz.transporter_id = $1
       JOIN delivery_zones dz ON tdz.zone_id = dz.id
       WHERE s.current_status IN (
           -- Colis au relais d'origine, prêt à être ramassé par le transporteur
           'RELAY_ORIGIN_RECEIVED',
           -- Colis en cours de transport (déjà pris en charge)
           'CARRIER_COLLECTED', 'IN_TRANSIT',
           -- Colis au relais de destination, à livrer ou disponible
           'RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP',
           -- Ramassage à domicile : prêt à être enlevé chez l'expéditeur
           'PICKUP_PENDING'
         )
         AND (
           -- Pour les livraisons en point relais : vérifier si le point relais de destination est dans la zone
           (NOT s.home_delivery AND s.destination_relay_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM relay_points rp
              WHERE rp.id = s.destination_relay_id
                AND rp.zone_id = dz.id
            ))
           OR
           -- Pour les livraisons à domicile : vérifier si la commune du destinataire est dans la zone
           (s.home_delivery AND s.recipient_commune = ANY(dz.communes))
           OR
           -- Pour les colis avec ramassage à domicile (origin_relay_id NULL) : commune de l'expéditeur dans la zone
           (s.origin_relay_id IS NULL AND s.sender_commune IS NOT NULL AND s.sender_commune = ANY(dz.communes))
         )
         AND NOT EXISTS (
           SELECT 1 FROM transporter_assignments ta2
           WHERE ta2.shipment_id = s.id AND ta2.transporter_id != $1
         )
         -- Exclure les colis déjà retournés par assignedResult pour éviter les doublons
         AND NOT EXISTS (
           SELECT 1 FROM transporter_assignments ta3
           WHERE ta3.shipment_id = s.id AND ta3.transporter_id = $1
         )
       ORDER BY s.created_at DESC`,
      [transporterId]
    );


    // Combiner les résultats et supprimer les doublons
    const allPackages = [...assignedResult.rows, ...zoneResult.rows];
    const uniquePackages = new Map();
    allPackages.forEach((pkg) => {
      if (!uniquePackages.has(pkg.id)) {
        uniquePackages.set(pkg.id, pkg);
      }
    });

    const finalPackages = Array.from(uniquePackages.values());
    if (finalPackages.length > 0) {
    }

    res.json(finalPackages);
  } catch (error: any) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get delivered shipments for a transporter
router.get('/transporter/delivered-shipments', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterResult = await pool.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
    const transporterId = transporterResult.rows[0]?.id;


    if (!transporterId) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }

    // Requête de diagnostic : trouver tous les colis avec ces statuts qui ont été assignés à ce transporteur
    await pool.query(
      `SELECT s.id, s.tracking_number, s.current_status, s.destination_relay_id,
              EXISTS(SELECT 1 FROM transporter_assignments ta WHERE ta.shipment_id = s.id AND ta.transporter_id = $1) as has_assignment,
              EXISTS(SELECT 1 FROM shipment_handoffs sh WHERE sh.shipment_id = s.id AND sh.from_type = 'transporter' AND sh.from_id::uuid = $1) as has_handoff,
              s.transporter_id = $1 as has_transporter_id,
              EXISTS(SELECT 1 FROM shipment_tracking st JOIN users u ON st.updated_by = u.id JOIN transporters t ON t.user_id = u.id WHERE st.shipment_id = s.id AND t.id = $1) as has_tracking
       FROM shipments s
       WHERE s.current_status IN ('RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP')
       ORDER BY s.updated_at DESC`,
      [transporterId]
    );

    // Récupérer les colis livrés qui ont été assignés à ce transporteur
    // OU qui ont ce transporteur dans shipments.transporter_id
    // OU qui ont été livrés par ce transporteur (via updated_by)
    const deliveredResult = await pool.query(
      `SELECT DISTINCT ON (s.id)
        s.*,
        COALESCE(ta.assignment_status, 'delivered') as assignment_status,
        ta.expected_pickup_at,
        ta.picked_up_at,
        COALESCE(rp.name, rp_origin.name) as relay_name,
        COALESCE(rp.address, rp_origin.address) as relay_address,
        COALESCE(rp.commune, rp_origin.commune) as relay_commune,
        rp_dest.name as destination_relay_name,
        rp_dest.address as destination_relay_address,
        rp_dest.commune as destination_relay_commune,
        rp_dest.id as destination_relay_id,
        st.created_at as delivered_at
       FROM shipments s
       LEFT JOIN transporter_assignments ta ON ta.shipment_id = s.id AND ta.transporter_id = $1
       LEFT JOIN relay_points rp ON ta.relay_point_id = rp.id
       LEFT JOIN relay_points rp_origin ON s.origin_relay_id = rp_origin.id
       LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
      LEFT JOIN LATERAL (
        SELECT created_at, updated_by, status
        FROM shipment_tracking
        WHERE shipment_id = s.id
          AND status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP')
        ORDER BY created_at DESC
        LIMIT 1
      ) st ON true
      WHERE (
        (
          -- Colis complètement livrés (au client final)
          s.current_status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER')
          AND (
            -- Colis assignés à ce transporteur
            ta.transporter_id = $1
            OR s.transporter_id = $1
            OR st.updated_by = $2
            OR EXISTS (
              SELECT 1 FROM shipment_tracking st2
              JOIN users u ON st2.updated_by = u.id
              JOIN transporters t2 ON t2.user_id = u.id
              WHERE st2.shipment_id = s.id
                AND st2.status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER')
                AND t2.id = $1
            )
            OR s.updated_by = $2
          )
        )
        OR
        (
          -- Colis déposés au point relais de destination (réceptionnés par le relais)
          s.current_status IN ('RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP')
          AND (
            -- Toute trace d'association avec ce transporteur
            -- Méthode 1: Assignement existant (même avec status "delivered")
            EXISTS (
              SELECT 1 FROM transporter_assignments ta_all
              WHERE ta_all.shipment_id = s.id
                AND ta_all.transporter_id = $1
            )
            OR
            -- Méthode 2: Handoff explicite du transporteur vers le relais
            EXISTS (
              SELECT 1 FROM shipment_handoffs sh
              WHERE sh.shipment_id = s.id
                AND sh.from_type = 'transporter'
                AND sh.from_id::uuid = $1
                AND (sh.handoff_type = 'transporter_to_relay' OR sh.handoff_type = 'transporter_to_destination')
            )
            OR
            -- Méthode 3: Colis avec transporter_id correspondant
            s.transporter_id = $1
            OR
            -- Méthode 4: Transporteur a créé un tracking pour ce colis
            EXISTS (
              SELECT 1 FROM shipment_tracking st_any
              JOIN users u_any ON st_any.updated_by = u_any.id
              JOIN transporters t_any ON t_any.user_id = u_any.id
              WHERE st_any.shipment_id = s.id
                AND t_any.id = $1
            )
            OR
            -- Méthode 5: Transporteur a mis à jour directement le colis
            s.updated_by = $2
            OR
            -- Méthode 6: Via le LEFT JOIN (colis actuellement assignés)
            ta.transporter_id = $1
          )
        )
      )
       ORDER BY s.id, st.created_at DESC NULLS LAST, s.updated_at DESC`,
      [transporterId, req.user!.id]
    );

    
    res.json(deliveredResult.rows);
  } catch (error: any) {
    console.error('Get delivered shipments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin route: Get assignments for a specific transporter
router.get('/admin/transporter/:transporterId/assignments', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const transporterId = req.params.transporterId;

    if (!transporterId) {
      return res.status(400).json({ error: 'ID transporteur requis' });
    }

    // Récupérer les colis explicitement assignés
    const assignedResult = await pool.query(
      `SELECT 
        s.*,
        ta.assignment_status,
        ta.expected_pickup_at,
        ta.picked_up_at,
        rp.name as relay_name,
        rp.address as relay_address,
        rp.commune as relay_commune,
        rp.latitude as relay_latitude,
        rp.longitude as relay_longitude,
        rp_dest.name as destination_relay_name,
        rp_dest.address as destination_relay_address,
        rp_dest.commune as destination_relay_commune,
        rp_dest.id as destination_relay_id,
        rp_dest.latitude as destination_relay_latitude,
        rp_dest.longitude as destination_relay_longitude
       FROM transporter_assignments ta
       JOIN shipments s ON ta.shipment_id = s.id
       LEFT JOIN relay_points rp ON ta.relay_point_id = rp.id
       LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
       WHERE ta.transporter_id = $1
       ORDER BY ta.created_at DESC`,
      [transporterId]
    );

    // Récupérer aussi les colis dans la zone du transporteur (même non explicitement assignés)
    const zoneResult = await pool.query(
      `SELECT DISTINCT
        s.*,
        'pending' as assignment_status,
        NULL as expected_pickup_at,
        NULL as picked_up_at,
        rp_origin.name as relay_name,
        rp_origin.address as relay_address,
        rp_origin.commune as relay_commune,
        rp_origin.latitude as relay_latitude,
        rp_origin.longitude as relay_longitude,
        rp_dest.name as destination_relay_name,
        rp_dest.address as destination_relay_address,
        rp_dest.commune as destination_relay_commune,
        rp_dest.id as destination_relay_id,
        rp_dest.latitude as destination_relay_latitude,
        rp_dest.longitude as destination_relay_longitude
       FROM shipments s
       LEFT JOIN relay_points rp_origin ON s.origin_relay_id = rp_origin.id
       LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
       JOIN transporter_delivery_zones tdz ON tdz.transporter_id = $1
       JOIN delivery_zones dz ON tdz.zone_id = dz.id
       WHERE s.current_status NOT IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER')
         AND (
           -- Pour les livraisons en point relais : vérifier si le point relais de destination est dans la zone
           (NOT s.home_delivery AND s.destination_relay_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM relay_points rp
              WHERE rp.id = s.destination_relay_id
                AND rp.zone_id = dz.id
            ))
           OR
           -- Pour les livraisons à domicile : vérifier si la commune du destinataire est dans la zone
           (s.home_delivery AND s.recipient_commune = ANY(dz.communes))
           OR
           -- Pour les colis avec ramassage à domicile (origin_relay_id NULL) ET livraison en point relais :
           -- vérifier si le point relais de destination est dans la zone (le transporteur peut livrer même si le ramassage est hors zone)
           (s.origin_relay_id IS NULL AND NOT s.home_delivery AND s.destination_relay_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM relay_points rp
              WHERE rp.id = s.destination_relay_id
                AND rp.zone_id = dz.id
            ))
         )
         AND NOT EXISTS (
           SELECT 1 FROM transporter_assignments ta2
           WHERE ta2.shipment_id = s.id AND ta2.transporter_id != $1
         )
       ORDER BY s.created_at DESC`,
      [transporterId]
    );

    // Combiner les résultats et supprimer les doublons
    const allPackages = [...assignedResult.rows, ...zoneResult.rows];
    const uniquePackages = new Map();
    allPackages.forEach((pkg) => {
      if (!uniquePackages.has(pkg.id)) {
        uniquePackages.set(pkg.id, pkg);
      }
    });

    const finalPackages = Array.from(uniquePackages.values());
    res.json(finalPackages);
  } catch (error: any) {
    console.error('Get admin assignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipments ready for pickup at a relay
router.get('/relay/pickups', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
    const relayId = relayResult.rows[0]?.relay_point_id;

    if (!relayId) {
      return res.json([]); // Return empty array instead of 404
    }

    // Get shipments pending at this relay (ready for transporter pickup)
    const result = await pool.query(
      `SELECT s.*, 
        t.user_id as transporter_user_id,
        u.first_name as transporter_first_name,
        u.last_name as transporter_last_name
       FROM shipments s
       LEFT JOIN transporters t ON s.transporter_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE s.origin_relay_id = $1
         AND s.current_status IN ('READY_FOR_DROP_OFF', 'RELAY_ORIGIN_RECEIVED')
       ORDER BY s.created_at DESC`,
      [relayId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get relay pickups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipments ready for delivery at a relay
router.get('/relay/deliveries', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
    const relayId = relayResult.rows[0]?.relay_point_id;

    if (!relayId) {
      return res.json([]); // Return empty array instead of 404
    }

    // Get shipments at_relay (ready for recipient pickup)
    const result = await pool.query(
      `SELECT s.*, 
        t.user_id as transporter_user_id,
        u.first_name as transporter_first_name,
        u.last_name as transporter_last_name
       FROM shipments s
       LEFT JOIN transporters t ON s.transporter_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE s.destination_relay_id = $1 AND s.current_status = 'AVAILABLE_FOR_PICKUP'
       ORDER BY s.created_at DESC`,
      [relayId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get relay deliveries error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipments for a transporter at a specific relay point
router.get('/transporter/:transporterId/relay/:relayId/shipments', authenticate, requireRole('relay_partner', 'transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { transporterId, relayId } = req.params;
    
    
    // Verify access
    if (req.user!.role === 'relay_partner') {
      // Relay partner can only see shipments for their own relay
      const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
      const userRelayId = relayResult.rows[0]?.relay_point_id;
      if (userRelayId !== relayId) {
        return res.status(403).json({ error: 'Vous ne pouvez consulter que les colis de votre point relais' });
      }
    } else if (req.user!.role === 'transporter') {
      // Transporter can only see their own shipments
      const transporterResult = await pool.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
      const userTransporterId = transporterResult.rows[0]?.id;
      if (userTransporterId !== transporterId) {
        return res.status(403).json({ error: 'Vous ne pouvez consulter que vos propres colis' });
      }
    }

    // Get shipments for this transporter at this relay point
    // Pour un point relais qui cherche, on montre tous les colis que le transporteur doit gérer à ce point relais
    // (colis à ramasser au point relais d'origine OU colis à livrer au point relais de destination)
    // Même s'ils ne sont pas encore explicitement assignés au transporteur
    const result = await pool.query(
      `SELECT 
        s.*,
        s.pickup_code as package_code,
        CONCAT(s.sender_first_name, ' ', s.sender_last_name) as sender_name,
        CONCAT(s.recipient_first_name, ' ', s.recipient_last_name) as recipient_name,
        s.recipient_phone,
        s.recipient_address,
        s.home_delivery,
        s.current_status,
        s.payment_status,
        COALESCE(ta.assignment_status, 
          CASE 
            WHEN s.current_status IN ('IN_TRANSIT', 'CARRIER_COLLECTED') THEN 'in_transit'
            WHEN s.current_status = 'RELAY_FINAL_RECEIVED' THEN 'delivered'
            ELSE 'pending'
          END
        ) as assignment_status,
        ta.picked_up_at,
        -- Données du point relais d'origine (pour les colis à ramasser)
        rp_origin.name as origin_relay_name,
        rp_origin.address as origin_relay_address,
        rp_origin.commune as origin_relay_commune,
        rp_origin.latitude as origin_relay_latitude,
        rp_origin.longitude as origin_relay_longitude,
        -- Données du point relais de destination (pour les colis à livrer)
        rp_dest.name as destination_relay_name,
        rp_dest.address as destination_relay_address,
        rp_dest.commune as destination_relay_commune,
        rp_dest.latitude as destination_relay_latitude,
        rp_dest.longitude as destination_relay_longitude,
        -- Indicateur pour savoir si c'est un colis à ramasser ou à livrer
        CASE 
          WHEN s.origin_relay_id = $2 THEN 'pickup'
          WHEN s.destination_relay_id = $2 THEN 'delivery'
          ELSE NULL
        END as relay_action_type
      FROM shipments s
      LEFT JOIN transporter_assignments ta ON s.id = ta.shipment_id AND ta.transporter_id = $1
      LEFT JOIN relay_points rp_origin ON s.origin_relay_id = rp_origin.id
      LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
      WHERE (
        -- Colis à ramasser au point relais d'origine :
        -- assignés à ce transporteur OU dans sa zone de livraison et pas pris par un autre
        (s.origin_relay_id = $2
          AND s.current_status IN ('RELAY_ORIGIN_RECEIVED', 'PAYMENT_RECEIVED_AT_RELAY')
          AND (
            ta.transporter_id = $1
            OR s.transporter_id = $1
            OR (
              -- Colis dans la zone du transporteur, pas encore pris par quelqu'un d'autre
              NOT EXISTS (
                SELECT 1 FROM transporter_assignments ta2
                WHERE ta2.shipment_id = s.id AND ta2.transporter_id != $1
              )
              AND (
                EXISTS (
                  SELECT 1 FROM transporter_delivery_zones tdz
                  JOIN delivery_zones dz ON tdz.zone_id = dz.id
                  JOIN relay_points rp_d ON rp_d.id = s.destination_relay_id
                  WHERE tdz.transporter_id = $1 AND rp_d.zone_id = dz.id
                )
                OR EXISTS (
                  SELECT 1 FROM transporter_delivery_zones tdz
                  JOIN delivery_zones dz ON tdz.zone_id = dz.id
                  WHERE tdz.transporter_id = $1
                    AND s.home_delivery = true
                    AND s.recipient_commune = ANY(dz.communes)
                )
              )
            )
          )
        )
        OR
        -- Colis à livrer au point relais de destination
        -- Pour un point relais qui cherche, on montre tous les colis destinés à ce point relais
        -- qui sont dans la zone du transporteur ou assignés au transporteur
        (s.destination_relay_id = $2 AND (
          -- Colis assignés à ce transporteur via transporter_assignments
          ta.transporter_id = $1
          OR
          -- Colis avec transporter_id correspondant à ce transporteur
          s.transporter_id = $1
          OR
          -- Colis en transit ramassés par ce transporteur (via shipment_handoffs)
          EXISTS (
            SELECT 1 FROM shipment_handoffs sh
            WHERE sh.shipment_id = s.id
              AND sh.from_type = 'transporter'
              AND sh.from_id::uuid = $1
          )
        ))
      )
      AND s.current_status NOT IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER', 'RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP')
      ORDER BY 
        CASE 
          WHEN s.current_status = 'RELAY_FINAL_RECEIVED' THEN 1
          WHEN s.current_status IN ('IN_TRANSIT', 'CARRIER_COLLECTED') THEN 2
          WHEN s.current_status = 'RELAY_ORIGIN_RECEIVED' THEN 3
          ELSE 4
        END,
        s.created_at DESC`,
      [transporterId, relayId]
    );

    if (result.rows.length > 0) {
    }

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get transporter shipments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify pickup code for recipient
router.post('/verify-pickup', authenticate, async (req: AuthRequest, res) => {
  try {
    const { tracking_number, pickup_code, recipient_id_number } = req.body;

    if (!tracking_number || !pickup_code) {
      return res.status(400).json({ error: 'tracking_number et pickup_code sont requis' });
    }

    const trimmedCode = pickup_code.toString().trim();

    const result = await pool.query(
      `SELECT * FROM shipments 
       WHERE tracking_number = $1 AND pickup_code = $2`,
      [tracking_number, trimmedCode]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Code de retrait invalide' });
    }

    const shipment = result.rows[0];

    // Verify recipient identity (name and phone match)
    const recipientMatch = 
      !recipient_id_number ||
      shipment.recipient_phone === recipient_id_number || 
      (shipment.recipient_email && shipment.recipient_email.toLowerCase() === String(recipient_id_number).toLowerCase());

    if (!recipientMatch) {
      return res.status(400).json({ error: 'Identité du destinataire non vérifiée' });
    }

    const normalizedStatus = (shipment.current_status || '').toUpperCase();
    const hasDestinationScan = ['RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP', 'DELIVERED', 'DELIVERED_TO_CUSTOMER'].includes(normalizedStatus);

    if (shipment.home_delivery) {
      const okHomeRelayVerify = ['IN_TRANSIT', 'CARRIER_COLLECTED', 'DELIVERED', 'DELIVERED_TO_CUSTOMER'].includes(normalizedStatus);
      if (!okHomeRelayVerify) {
        return res.status(400).json({ error: 'Le colis n\'est pas encore en cours de livraison' });
      }
    } else {
      if (!hasDestinationScan) {
        return res.status(400).json({ error: 'Le colis n\'est pas encore disponible pour retrait' });
      }
    }

    res.json({
      success: true,
      shipment,
      message: 'Code de retrait valide'
    });
  } catch (error: any) {
    console.error('Verify pickup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark shipment as picked up by recipient
router.post(
  '/:id/pickup',
  authenticate,
  requireRole('relay_partner', 'transporter', 'admin', 'support', 'support_supervisor'),
  async (req: AuthRequest, res) => {
  try {
    const { pickup_code, recipient_verified } = req.body;

    const shipmentResult = await pool.query('SELECT * FROM shipments WHERE id = $1', [req.params.id]);
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis non trouvé' });
    }

    const shipment = shipmentResult.rows[0];

    if (pickup_code && shipment.pickup_code !== pickup_code.toString().trim()) {
      return res.status(400).json({ error: 'Code de retrait invalide' });
    }

    if (!recipient_verified) {
      return res.status(400).json({ error: 'Vérification du destinataire requise' });
    }

    const scannerType =
      req.user!.role === 'relay_partner'
        ? 'relay'
        : req.user!.role === 'transporter'
          ? 'transporter'
          : 'hub';

    const scanResult = await pool.query(
      `SELECT process_shipment_scan($1, 'PICKED_UP_BY_CUSTOMER'::shipment_status, NULL, $2::text, $3, NOW(), $4, $5) AS r`,
      [
        shipment.tracking_number,
        req.user!.id,
        scannerType,
        'Colis retiré par le destinataire',
        processScanBypassFromRole(req.user!.role),
      ]
    );
    const r = scanResult.rows[0]?.r;
    if (!r?.success) {
      return res.status(400).json({ error: r?.error || 'Impossible de valider le retrait (statut colis)' });
    }

    await pool.query('UPDATE shipments SET updated_by = $1 WHERE id = $2', [req.user!.id, req.params.id]);

    await pool.query(
      'INSERT INTO shipment_tracking (shipment_id, status, notes, updated_by) VALUES ($1, $2, $3, $4)',
      [req.params.id, 'PICKED_UP_BY_CUSTOMER', 'Colis retiré par le destinataire', req.user!.id]
    );

    await pool.query(
      `UPDATE shipments
       SET pickup_code_verified_at = NOW(),
           pickup_code_verified_by = $1
       WHERE id = $2`,
      [req.user!.id, req.params.id]
    );

    res.json({
      success: true,
      message: 'Colis marqué comme récupéré'
    });
  } catch (error: any) {
    console.error('Mark pickup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List incidents (admin / support)
router.get('/incidents', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { resolved, limit = '50', offset = '0' } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (resolved === 'true') {
      conditions.push('si.resolved = TRUE');
    } else if (resolved === 'false') {
      conditions.push('si.resolved = FALSE');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT si.id, si.tracking_number, si.incident_type, si.description,
              si.latitude, si.longitude, si.resolved, si.resolved_at, si.reported_at,
              s.shipment_code, s.current_status,
              u.first_name || ' ' || u.last_name AS transporter_name,
              u.phone AS transporter_phone
       FROM shipment_incidents si
       JOIN shipments s ON s.id = si.shipment_id
       JOIN transporters t ON t.id = si.transporter_id
       JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY si.reported_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(String(limit)), parseInt(String(offset))]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('List incidents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve an incident (admin / support)
router.patch('/incidents/:id/resolve', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE shipment_incidents
       SET resolved = TRUE, resolved_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident introuvable' });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Resolve incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Report an incident for a shipment (transporter only)
router.post('/transporter/incident', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { tracking_number, incident_type, description, latitude, longitude } = req.body;

    if (!tracking_number || !incident_type || !description) {
      return res.status(400).json({ error: 'tracking_number, incident_type et description sont requis' });
    }

    const validTypes = ['client_absent', 'adresse_erronee', 'colis_endommage', 'relais_ferme', 'autre'];
    if (!validTypes.includes(incident_type)) {
      return res.status(400).json({ error: 'Type d\'incident invalide' });
    }

    const shipmentResult = await pool.query(
      'SELECT id, tracking_number FROM shipments WHERE tracking_number = $1',
      [tracking_number.toUpperCase()]
    );
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }
    const shipment = shipmentResult.rows[0];

    const transporterResult = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur introuvable' });
    }
    const transporterId = transporterResult.rows[0].id;

    await pool.query(
      `INSERT INTO shipment_incidents
         (shipment_id, tracking_number, transporter_id, incident_type, description, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [shipment.id, shipment.tracking_number, transporterId, incident_type, description,
       latitude || null, longitude || null]
    );

    await pool.query(
      `INSERT INTO tracking_events
         (shipment_id, tracking_number, status, location_id, scanner_id, scanner_type, notes, "timestamp")
       VALUES ($1, $2, 'INCIDENT', NULL, $3, 'transporter', $4, NOW())`,
      [shipment.id, shipment.tracking_number, req.user!.id,
       `Incident : ${incident_type} — ${description}`]
    );

    res.json({ success: true, message: 'Incident enregistré' });
  } catch (error: any) {
    console.error('Report incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

