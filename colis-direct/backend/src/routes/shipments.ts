import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';
import { dispatchWebhooks } from '../services/webhookDispatcher';
import jwt from 'jsonwebtoken';
import { processScanBypassFromRole } from '../lib/processScanBypass';
import { SQL_READY_FOR_CARRIER_PICKUP } from '../lib/readyForCarrierPickup';
import dispatchService from '../services/dispatchService';
import { computePricing, deriveModeKey, resolvePackageSize, finalPriceForMode, type PackageSize } from '../services/pricingService';

const router = express.Router();

// Get all shipments (with filters)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, payment_status, relay_id, current_status } = req.query as {
      status?: string;
      payment_status?: string;
      relay_id?: string;
      current_status?: string;
    };
    let query = `SELECT s.*, 
                 row_to_json(mmp.*) AS mobile_money_payment,
                 row_to_json(rcp.*) AS relay_cash_payment,
                 shipment_effective_status(s.current_status::text, s.payment_method, s.payment_status, COALESCE(mmp.status::text, ''), COALESCE(rcp.status::text, '')) AS effective_status,
                 rp_dest.zone_id as delivery_zone_id,
                 dz.name as delivery_zone_name
                  FROM shipments s
                  LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
                  LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
                 LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
                 LEFT JOIN delivery_zones dz ON rp_dest.zone_id = dz.id
                 WHERE 1=1
                 AND s.current_status IS NOT NULL`;
    const params: any[] = [];
    let paramCount = 0;

    if (req.user!.role !== 'admin') {
      // Non-admins can only see shipments related to them
      if (req.user!.role === 'relay_partner') {
        query += ` AND (s.origin_relay_id = $${++paramCount} OR s.destination_relay_id = $${paramCount})`;
        const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
        const relayId = relayResult.rows[0]?.relay_point_id;
        params.push(relayId);
      } else {
        // Regular users see their own shipments
        // Include shipments by email OR phone (for guest checkouts)
        const userResult = await pool.query('SELECT email, phone FROM users WHERE id = $1', [req.user!.id]);
        const userEmail = userResult.rows[0]?.email;
        const userPhone = userResult.rows[0]?.phone;
        
        query += ` AND (`;
        const conditions: string[] = [];
        
        if (userEmail) {
          conditions.push(`s.sender_email = $${++paramCount}`);
          params.push(userEmail);
        }
        
        if (userPhone) {
          // Normalize phone numbers for comparison (remove spaces, dashes, prefixes +225/225/0)
          // Use a function to normalize both sides for better matching
          conditions.push(`(
            REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(s.sender_phone, ''), '[\\s\\-\\(\\)]', '', 'g'), '^\\+225', ''), '^225', ''), '^0', '') = 
            REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE($${++paramCount}, '[\\s\\-\\(\\)]', '', 'g'), '^\\+225', ''), '^225', ''), '^0', '')
            OR s.sender_phone = $${paramCount}
            OR s.sender_phone = '0' || $${paramCount}
            OR s.sender_phone = '+225' || $${paramCount}
            OR s.sender_phone = '225' || $${paramCount}
            OR s.sender_phone = '+225 ' || $${paramCount}
            OR s.sender_phone = '+225' || REGEXP_REPLACE($${paramCount}, '^0', '')
          )`);
          params.push(userPhone);
        }
        
        if (conditions.length === 0) {
          // No email or phone, return empty result
          query += ' 1=0';
        } else {
          query += conditions.join(' OR ');
        }
        query += `)`;
      }
    }

    const requestedPaymentStatus = payment_status || status;
    if (requestedPaymentStatus) {
      query += ` AND s.payment_status = $${++paramCount}`;
      params.push(requestedPaymentStatus);
    }

    if (current_status) {
      query += ` AND s.current_status = $${++paramCount}`;
      params.push(current_status);
    }

    if (relay_id) {
      query += ` AND (s.origin_relay_id = $${++paramCount} OR s.destination_relay_id = $${paramCount})`;
      params.push(relay_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipment by tracking number for transporter pickup (includes home_pickup shipments)
router.get('/pickup/tracking/:trackingNumber', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const normalizedInput = trackingNumber.trim().toUpperCase();
    
    // Détecter le type de code (tracking_number ou shipment_code)
    const isShipmentCode = /^[0-9]{4}[A-Z]{2}$/.test(normalizedInput);
    
    let whereClause: string;
    let searchValue: string;
    
    if (isShipmentCode) {
      whereClause = 's.shipment_code = $1';
      searchValue = normalizedInput;
    } else {
      // Rechercher par tracking_number ou shipment_code si ce n'est pas un format shipment_code
      whereClause = '(s.tracking_number = $1 OR s.shipment_code = $1)';
      searchValue = normalizedInput;
    }
    
    let query = `SELECT s.*, 
                 row_to_json(mmp.*) AS mobile_money_payment,
                 row_to_json(rcp.*) AS relay_cash_payment,
                 shipment_effective_status(s.current_status::text, s.payment_method, s.payment_status, COALESCE(mmp.status::text, ''), COALESCE(rcp.status::text, '')) AS effective_status
                 FROM shipments s
                 LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
                 LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
                 WHERE s.current_status IS NOT NULL
                 AND ${whereClause}
                 AND ${SQL_READY_FOR_CARRIER_PICKUP}
                 AND (s.current_status IS NULL OR s.current_status NOT IN ('CANCELLED', 'RETURN_TO_SENDER', 'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'))
                 LIMIT 1`;

    
    const result = await pool.query(query, [searchValue]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable avec ce numéro de suivi ou code d\'envoi' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get shipment by tracking for pickup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipments ready for pickup by sender phone (for transporter pickup at home)
router.get('/pickup/sender-phone/:phone', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const { phone } = req.params;
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^(\+225|225)/, '').replace(/^0/, '');
    
    
    let query = `SELECT s.*, 
                 row_to_json(mmp.*) AS mobile_money_payment,
                 row_to_json(rcp.*) AS relay_cash_payment,
                 shipment_effective_status(s.current_status::text, s.payment_method, s.payment_status, COALESCE(mmp.status::text, ''), COALESCE(rcp.status::text, '')) AS effective_status
                 FROM shipments s
                 LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
                 LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
                 WHERE (
                   -- Normaliser le numéro de téléphone dans la DB et comparer avec le numéro normalisé recherché
                   REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(s.sender_phone, '[\\s\\-\\(\\)]', '', 'g'), '^\\+225', ''), '^225', ''), '^0', '') = $1
                   OR s.sender_phone = $1
                   OR s.sender_phone = '0' || $1
                   OR s.sender_phone = '+225' || $1
                   OR s.sender_phone = '225' || $1
                 )
                 AND ${SQL_READY_FOR_CARRIER_PICKUP}
                 AND (s.current_status IS NULL OR s.current_status NOT IN ('CANCELLED', 'RETURN_TO_SENDER', 'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'))
                 ORDER BY s.created_at DESC`;

    
    const resultPickup = await pool.query(query, [normalizedPhone]);
    
    res.json(resultPickup.rows);
  } catch (error: any) {
    console.error('Get shipments for pickup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search shipments by phone number (sender or recipient)
router.get('/search/phone/:phone', authenticate, async (req: AuthRequest, res) => {
  try {
    const { phone } = req.params;
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^(\+225|225)/, '').replace(/^0/, '');
    
    const userRelayId = req.user!.role === 'relay_partner' 
      ? (await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id])).rows[0]?.relay_point_id
      : null;
    

    let query = `SELECT s.*,
                 row_to_json(mmp.*) AS mobile_money_payment,
                 row_to_json(rcp.*) AS relay_cash_payment,
                 shipment_effective_status(s.current_status::text, s.payment_method, s.payment_status, COALESCE(mmp.status::text, ''), COALESCE(rcp.status::text, '')) AS effective_status
                 FROM shipments s
                 LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
                 LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
                 WHERE `;

    const params: any[] = [normalizedPhone];

      // Si c'est un relay_partner, chercher par sender_phone pour les dépôts en point relais
      // Tous les colis créés par l'expéditeur et enregistrés comme dépôt dans ce point relais doivent apparaître
      // Y compris ceux déjà réceptionnés (RELAY_ORIGIN_RECEIVED) pour permettre de les gérer
      // Normaliser les numéros de téléphone pour la comparaison (supprimer espaces, tirets, préfixes +225/225/0)
      if (userRelayId) {
        // Pour un relay_partner, deux cas selon le rôle du client :
        //
        // CAS 1 — Expéditeur vient DÉPOSER son colis (sender_phone)
        //   • N'importe quel relais peut recevoir (origin_relay_id NULL ou = ce relais)
        //   • Statuts en attente de dépôt uniquement (pas encore déposé)
        //
        // CAS 2 — Destinataire vient RETIRER son colis (recipient_phone)
        //   • Uniquement si destination_relay_id = CE relais précis
        //   • Statuts "disponible au retrait"
        const phoneMatch = `(
                   REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(s.%FIELD%, '[\\s\\-\\(\\)]', '', 'g'), '^\\+225', ''), '^225', ''), '^0', '') = $1
                   OR s.%FIELD% = $1
                   OR s.%FIELD% = '0' || $1
                   OR s.%FIELD% = '+225' || $1
                   OR s.%FIELD% = '225' || $1
                 )`;
        const senderMatch = phoneMatch.replace(/%FIELD%/g, 'sender_phone');
        const recipientMatch = phoneMatch.replace(/%FIELD%/g, 'recipient_phone');

        query += `(
                 -- CAS 1 : expéditeur dépose ici — uniquement si ce relais est l'origine assignée
                 (
                   ${senderMatch}
                   AND s.origin_relay_id = $2
                   AND s.current_status IN (
                     'READY_FOR_DROP_OFF'::shipment_status,
                     'PAYMENT_CONFIRMED_AWAITING_DROP'::shipment_status,
                     'PAYMENT_PENDING_AT_RELAY'::shipment_status,
                     'PAYMENT_RECEIVED_AT_RELAY'::shipment_status
                   )
                 )
                 OR
                 -- CAS 2 : destinataire retire SON colis à CE relais précis
                 (
                   ${recipientMatch}
                   AND s.destination_relay_id = $2
                   AND s.current_status IN (
                     'RELAY_FINAL_RECEIVED'::shipment_status,
                     'AVAILABLE_FOR_PICKUP'::shipment_status,
                     'PAYMENT_PENDING_AT_RELAY'::shipment_status,
                     'PAYMENT_RECEIVED_AT_RELAY'::shipment_status
                   )
                 )
               )`;
        params.push(userRelayId);
    } else {
      // Pour les autres rôles, chercher par sender_phone ou recipient_phone
      query += `(s.sender_phone = $1 OR s.recipient_phone = $1)
                 AND (s.current_status = 'READY_FOR_DROP_OFF'::shipment_status 
                      OR s.current_status = 'PAYMENT_CONFIRMED_AWAITING_DROP'::shipment_status
                      OR s.current_status = 'PAYMENT_PENDING_AT_RELAY'::shipment_status
                      OR s.current_status = 'PAYMENT_RECEIVED_AT_RELAY'::shipment_status
                      OR s.current_status = 'RELAY_ORIGIN_RECEIVED'::shipment_status)`;
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error('Search shipments by phone error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipment by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
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
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const shipment = result.rows[0];
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
    });
  } catch (error: any) {
    console.error('Get shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create shipment
router.post('/', async (req: any, res) => {
  try {
    // Try to get user from token (optional for guest checkout)
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        const decoded = jwt.verify(token, jwtSecret) as any;
        userId = decoded.id;
      }
    } catch (err) {
      // User not authenticated, continue as guest
    }

    const {
      tracking_number,
      sender_first_name,
      sender_last_name,
      sender_email,
      sender_phone,
      sender_commune,
      sender_quartier,
      sender_address,
      sender_repere,
      recipient_first_name,
      recipient_last_name,
      recipient_email,
      recipient_phone,
      recipient_commune,
      recipient_quartier,
      recipient_address,
      recipient_repere,
      package_type,
      weight,
      price,
      payment_status = 'pending',
      print_at_relay,
      relay_assisted,
      home_delivery,
      pickup_method,
      printing_fee = 0,
      assistance_fee = 0,
      box_price = 0,
      payment_method,
      origin_relay_id,
      destination_relay_id,
      promo_code,
      grid_type,
    } = req.body;

    // Générer le tracking_number côté serveur si non fourni (évite les collisions frontend)
    let finalTrackingNumber = tracking_number;
    if (!finalTrackingNumber) {
      // Générer un tracking number unique : CD + timestamp + random
      let tnExists = true;
      do {
        const ts = Date.now().toString().slice(-8);
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalTrackingNumber = `CD${ts}${rand}`;
        const tnCheck = await pool.query('SELECT COUNT(*) as count FROM shipments WHERE tracking_number = $1', [finalTrackingNumber]);
        tnExists = parseInt(tnCheck.rows[0].count) > 0;
      } while (tnExists);
    }

    // Generate shipment_code (4 digits + 2 letters, for physical labeling)
    let shipment_code: string;
    try {
      const shipmentCodeResult = await pool.query('SELECT generate_shipment_code() as code');
      shipment_code = shipmentCodeResult.rows[0].code;
    } catch (error: any) {
      // Function doesn't exist, generate manually
      console.warn('generate_shipment_code() function not found, generating code manually');
      let code: string;
      let exists = true;
      do {
        const digits = Math.floor(1000 + Math.random() * 9000).toString();
        const letter1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const letter2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        code = digits + letter1 + letter2;
        const checkResult = await pool.query('SELECT COUNT(*) as count FROM shipments WHERE shipment_code = $1', [code]);
        exists = parseInt(checkResult.rows[0].count) > 0;
      } while (exists);
      shipment_code = code;
    }

    // ─── Recalcul serveur du prix de transport ───────────────────────────────
    // Le client ne fixe plus le prix : on le recalcule avec la même logique que
    // GET /pricing-grids/calculate (distance × taille + poids, remise du mode réel
    // déduit de pickup_method + home_delivery). Fallback sur la valeur client
    // uniquement si le calcul échoue (zone/tarif indisponible).
    let serverPrice = parseFloat(price || 0);
    try {
      const pkgSize: PackageSize = grid_type === 'courier' ? 'courrier' : resolvePackageSize(package_type);
      const computed = await computePricing(sender_commune, recipient_commune, pkgSize, parseFloat(weight) || 0);
      const fp = finalPriceForMode(computed, deriveModeKey(pickup_method, home_delivery));
      if (fp !== null && Number.isFinite(fp)) serverPrice = fp;
    } catch (e: any) {
      console.error('Recalcul prix serveur échoué, fallback prix client:', e.message);
    }

    // Calculate total price: base price + printing fee + assistance fee + box price
    const totalPrice = serverPrice + parseFloat(printing_fee || 0) + parseFloat(assistance_fee || 0) + parseFloat(box_price || 0);

    const rawPaymentMethod = (payment_method || '').toString().trim().toLowerCase();
    // paystack/cinetpay sont des providers frontend — on stocke toujours 'mobile_money' en DB
    const normalizedPaymentMethod = ['paystack', 'cinetpay'].includes(rawPaymentMethod)
      ? 'mobile_money'
      : rawPaymentMethod;
    // IMPORTANT: current_status doit toujours être un statut logistique, pas un statut de paiement
    // Les statuts de paiement (PAYMENT_*) sont uniquement pour effective_status (affichage)
    // Logique de statut initial selon le mode de dépôt :
    // - relay_deposit → READY_FOR_DROP_OFF (le client va déposer au relais)
    // - home_pickup   → PICKUP_PENDING     (un transporteur doit venir chercher le colis)
    // NOTE: PICKUP_PENDING sera activé après migration DB (ajout à l'enum shipment_status)
    let derivedStatus: string = 'READY_FOR_DROP_OFF';
    if (pickup_method === 'home_pickup') {
      derivedStatus = 'PICKUP_PENDING'; // sera rejeté si enum non migré — migration 20260517110000 requis
    }
    let derivedPaymentStatus = payment_status || 'pending';

    // Si pickup_method = 'home_pickup', le colis ne doit pas être déposé au relais
    // Donc origin_relay_id doit être NULL pour permettre au transporteur de le réceptionner directement
    const finalOriginRelayId = (pickup_method === 'home_pickup') ? null : (origin_relay_id || null);

    if (finalOriginRelayId && destination_relay_id && finalOriginRelayId === destination_relay_id) {
      res.status(400).json({ error: 'Le relais de dépôt et le relais de livraison ne peuvent pas être identiques' });
      return;
    }

    // Création atomique : le colis et son enregistrement de paiement cash doivent
    // exister ensemble ou pas du tout. Le trigger trg_count_promo_use (incrément promo)
    // s'exécute dans la même transaction → annulé aussi en cas de rollback.
    const client = await pool.connect();
    let newShipment: any;
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO shipments (
          tracking_number, sender_first_name, sender_last_name, sender_email, sender_phone,
          sender_commune, sender_quartier, sender_address, sender_repere,
          recipient_first_name, recipient_last_name, recipient_email, recipient_phone,
          recipient_commune, recipient_quartier, recipient_address, recipient_repere,
          package_type, weight, price, current_status, printing_fee, assistance_fee, box_price,
          print_at_relay, relay_assisted, home_delivery, pickup_code, shipment_code,
          payment_status, payment_method, pickup_method,
          origin_relay_id, destination_relay_id, created_by, promo_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
        RETURNING *`,
        [
          finalTrackingNumber,
          sender_first_name, sender_last_name, sender_email || null, sender_phone,
          sender_commune, sender_quartier, sender_address, sender_repere || null,
          recipient_first_name, recipient_last_name, recipient_email || null, recipient_phone,
          recipient_commune, recipient_quartier, recipient_address, recipient_repere || null,
          package_type, weight, serverPrice,
          derivedStatus,
          parseFloat(printing_fee || 0), parseFloat(assistance_fee || 0), parseFloat(box_price || 0),
          print_at_relay || false, relay_assisted || false, home_delivery || false,
          null,
          shipment_code,
          derivedPaymentStatus, normalizedPaymentMethod || null,
          pickup_method || 'relay_deposit', // INCO-004: stocker le mode de dépôt réel
          finalOriginRelayId, destination_relay_id || null,
          userId || null,
          promo_code ? promo_code.trim() : null,
        ]
      );

      newShipment = result.rows[0];

      if (normalizedPaymentMethod === 'relay_cash') {
        // collection_location sera défini lors de la confirmation du paiement
        // Par défaut NULL, sera mis à 'relay' ou 'transporter' selon qui confirme
        await client.query(
          `INSERT INTO relay_cash_payments (shipment_id, relay_point_id, amount_expected, collection_location)
           VALUES ($1, $2, $3, NULL)
           ON CONFLICT (shipment_id) DO NOTHING`,
          [
            newShipment.id,
            newShipment.origin_relay_id || newShipment.destination_relay_id || null,
            totalPrice,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

    // Effets secondaires best-effort, APRÈS commit : leur échec ne doit pas invalider
    // un colis déjà créé (l'agrégat de métriques se resynchronise par ailleurs).
    if (newShipment.origin_relay_id) {
      try {
        await pool.query(
          `SELECT refresh_relay_daily_metrics(
              $1,
              (SELECT (created_at AT TIME ZONE 'Africa/Abidjan')::date FROM shipments WHERE id = $2)
            )`,
          [newShipment.origin_relay_id, newShipment.id]
        );
      } catch (metricsErr: any) {
        console.error('refresh_relay_daily_metrics failed (non-bloquant):', metricsErr.message);
      }
    }

    // Auto-assign to best transporter if origin_relay_id exists OR if home_pickup (ramassage à domicile)
    // Pour les colis avec home_pickup, on peut aussi assigner automatiquement si une zone de livraison correspond
    if (newShipment.origin_relay_id || pickup_method === 'home_pickup') {
      try {
        const assignResult = await pool.query('SELECT assign_shipment_to_transporter($1) as transporter_id', [newShipment.id]);
        assignResult.rows[0]?.transporter_id; // auto-assign result, not used further
        // Reload shipment to get updated transporter_id
        const updatedResult = await pool.query('SELECT * FROM shipments WHERE id = $1', [newShipment.id]);
        if (updatedResult.rows.length > 0) {
          // ─── Dispatch Marketplace (non-bloquant) ─────────────────────────
          // Tenter le dispatch marketplace en parallèle (offre aux livreurs indépendants)
          dispatchService.dispatchShipment(newShipment.id).catch((err: any) =>
            console.error('Marketplace dispatch error (after assign):', err.message)
          );
          return res.status(201).json(updatedResult.rows[0]);
        }
      } catch (assignError: any) {
        console.error('Auto-assignment failed, shipment created without transporter:', assignError.message);
        console.error('Error details:', assignError);
        // Continue - shipment is created but not assigned yet
      }
    }

    // ─── Dispatch Marketplace pour tous les colis (non-bloquant) ─────────────
    dispatchService.dispatchShipment(newShipment.id).catch((err: any) =>
      console.error('Marketplace dispatch error:', err.message)
    );

    res.status(201).json(newShipment);
  } catch (error: any) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update shipment status
router.patch('/:id/status', authenticate, requireRole('admin', 'relay_partner', 'transporter', 'support'), async (req: AuthRequest, res) => {
  try {
    const { status, location, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status requis' });
    }

    const oldShipment = await pool.query(
      'SELECT id, tracking_number, current_status FROM shipments WHERE id = $1',
      [req.params.id]
    );
    if (oldShipment.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const row = oldShipment.rows[0];
    const oldStatus = row.current_status;

    if (String(oldStatus || '') === String(status)) {
      const same = await pool.query('SELECT * FROM shipments WHERE id = $1', [req.params.id]);
      return res.json(same.rows[0]);
    }

    const role = req.user!.role;
    const bypass = processScanBypassFromRole(role);
    const scannerType =
      role === 'relay_partner' ? 'relay' : role === 'transporter' ? 'transporter' : 'hub';

    let locationId: string | null = null;
    if (location && typeof location === 'string') {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRe.test(location.trim())) {
        locationId = location.trim();
      }
    }

    const scanResult = await pool.query(
      `SELECT process_shipment_scan($1, $2::shipment_status, $3, $4::text, $5, NOW(), $6, $7) AS r`,
      [
        row.tracking_number,
        status,
        locationId,
        req.user!.id,
        scannerType,
        notes || null,
        bypass,
      ]
    );
    const r = scanResult.rows[0]?.r;
    if (!r?.success) {
      return res.status(400).json({ error: r?.error || 'Transition non autorisée' });
    }

    await pool.query('UPDATE shipments SET updated_by = $1 WHERE id = $2', [req.user!.id, req.params.id]);

    await pool.query(
      'INSERT INTO shipment_tracking (shipment_id, status, location, notes, updated_by) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, status, location || null, notes || null, req.user!.id]
    );

    const result = await pool.query('SELECT * FROM shipments WHERE id = $1', [req.params.id]);

    await logAdminActivity(
      req.user!.id,
      'update_shipment_status',
      'shipment',
      req.params.id,
      { old_status: oldStatus, new_status: status, location, notes, actor_role: req.user!.role },
      req
    );

    dispatchWebhooks('shipment.status_changed', {
      shipment_id: req.params.id,
      tracking_number: result.rows[0].tracking_number,
      old_status: oldStatus,
      new_status: status,
      location: location || null,
      updated_at: result.rows[0].updated_at,
    }).catch((err: Error) => console.error('Webhook dispatch error:', err.message));

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually assign shipment to transporter (admin only)
router.post('/:id/assign', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT assign_shipment_to_transporter($1) as transporter_id',
      [req.params.id]
    );

    const transporterId = result.rows[0].transporter_id;

    // Get updated shipment
    const shipmentResult = await pool.query(
      'SELECT * FROM shipments WHERE id = $1',
      [req.params.id]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.json({
      shipment: shipmentResult.rows[0],
      transporter_id: transporterId,
      message: 'Shipment assigned successfully'
    });
  } catch (error: any) {
    console.error('Assign shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm payment for a shipment (for transporter pickup)
router.post('/:trackingNumber/confirm-payment', authenticate, requireRole('transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    
    // Get shipment
    const shipmentResult = await pool.query(
      'SELECT id, payment_status, payment_method FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    );
    
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }
    
    const shipment = shipmentResult.rows[0];
    
    // Update payment status
    await pool.query(
      'UPDATE shipments SET payment_status = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
      ['paid', req.user!.id, shipment.id]
    );
    
    // If relay_cash, also update relay_cash_payments
    // Si c'est un transporteur qui confirme, collection_location = 'transporter'
    if (shipment.payment_method === 'relay_cash') {
      const userRole = req.user!.role;
      const collectionLocation = userRole === 'transporter' ? 'transporter' : 'relay';
      
      // Récupérer le montant attendu pour le définir comme montant collecté si non défini
      const relayCashResult = await pool.query(
        `SELECT amount_expected FROM relay_cash_payments WHERE shipment_id = $1`,
        [shipment.id]
      );
      
      const amountExpected = relayCashResult.rows[0]?.amount_expected || null;
      
      await pool.query(
        `UPDATE relay_cash_payments 
         SET status = 'collected', 
             collected_by = $1, 
             collected_at = NOW(), 
             amount_collected = COALESCE(amount_collected, $4),
             collection_location = COALESCE(collection_location, $3),
             updated_at = NOW()
         WHERE shipment_id = $2`,
        [req.user!.id, shipment.id, collectionLocation, amountExpected]
      );
    }
    
    res.json({ success: true, message: 'Paiement confirmé' });
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject a shipment (for transporter pickup or relay partner)
router.post('/:trackingNumber/reject', authenticate, requireRole('transporter', 'admin', 'relay_partner'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const { reason } = req.body;
    
    // Get shipment
    const shipmentResult = await pool.query(
      'SELECT id FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    );
    
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }
    
    const shipment = shipmentResult.rows[0];

    // Transition via la machine à états (source de vérité) : enregistre aussi tracking_events.
    const scannerType = req.user!.role === 'relay_partner' ? 'relay' : req.user!.role === 'transporter' ? 'transporter' : 'hub';
    const scanResult = await pool.query(
      `SELECT process_shipment_scan($1, 'CANCELLED'::shipment_status, NULL, $2::text, $3, NOW(), $4, true) AS r`,
      [trackingNumber, req.user!.id, scannerType, reason ? `Rejeté: ${reason}` : 'Colis rejeté']
    );
    const r = scanResult.rows[0]?.r;
    if (!r?.success) {
      return res.status(400).json({ error: r?.error || 'Rejet impossible' });
    }
    await pool.query('UPDATE shipments SET updated_by = $1 WHERE id = $2', [req.user!.id, shipment.id]);

    res.json({ success: true, message: 'Colis rejeté' });
  } catch (error: any) {
    console.error('Reject shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a pending-payment shipment (client only, own shipments)
router.post('/:trackingNumber/switch-to-relay-payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT id, created_by, sender_email, sender_phone, current_status, payment_status, payment_method, pickup_method
       FROM shipments WHERE tracking_number = $1`,
      [trackingNumber]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Colis introuvable' });

    const s = result.rows[0];

    if (s.created_by !== userId) {
      const userResult = await pool.query('SELECT email, phone FROM users WHERE id = $1', [userId]);
      const u = userResult.rows[0];
      if (!u || (u.email !== s.sender_email && u.phone !== s.sender_phone)) {
        return res.status(403).json({ error: 'Accès interdit' });
      }
    }

    if ((s.payment_status || '').toLowerCase() === 'paid') {
      return res.status(400).json({ error: 'Ce colis a déjà été payé' });
    }
    const switchableStatuses = ['READY_FOR_DROP_OFF', 'PICKUP_PENDING', 'PENDING', 'PAYMENT_CONFIRMED_AWAITING_DROP'];
    if (!switchableStatuses.includes(s.current_status)) {
      return res.status(400).json({ error: 'Ce colis ne peut plus être modifié' });
    }

    // For relay_deposit shipments awaiting payment, move to READY_FOR_DROP_OFF
    const newStatus = s.pickup_method !== 'home_pickup' ? 'READY_FOR_DROP_OFF' : s.current_status;

    await pool.query(
      `UPDATE shipments SET payment_method = 'relay_cash', current_status = $1::shipment_status,
       updated_at = NOW(), updated_by = $2 WHERE id = $3`,
      [newStatus, userId, s.id]
    );

    await pool.query(
      `INSERT INTO tracking_events (shipment_id, tracking_number, status, notes, scanner_id, scanner_type, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [s.id, trackingNumber, newStatus, 'Mode de paiement changé : paiement lors de la prise en charge', userId, 'client']
    );

    res.json({ success: true, message: 'Mode de paiement mis à jour' });
  } catch (error: any) {
    console.error('Switch to relay payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:trackingNumber/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const userId = req.user!.id;

    const shipmentResult = await pool.query(
      `SELECT id, created_by, sender_email, sender_phone, current_status, payment_status, payment_method
       FROM shipments WHERE tracking_number = $1`,
      [trackingNumber]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];

    // Only the creator can cancel their own shipment
    if (shipment.created_by !== userId) {
      // Also allow if sender_email or sender_phone matches (guest-created shipments)
      const userResult = await pool.query('SELECT email, phone FROM users WHERE id = $1', [userId]);
      const userRow = userResult.rows[0];
      const emailMatch = userRow && shipment.sender_email && userRow.email === shipment.sender_email;
      const phoneMatch = userRow && shipment.sender_phone && userRow.phone === shipment.sender_phone;
      if (!emailMatch && !phoneMatch) {
        return res.status(403).json({ error: 'Vous ne pouvez annuler que vos propres colis' });
      }
    }

    // Only cancellable when payment is still pending and colis not yet picked up
    const cancellableStatuses = ['READY_FOR_DROP_OFF', 'PICKUP_PENDING', 'PENDING'];
    if (!cancellableStatuses.includes(shipment.current_status)) {
      return res.status(400).json({ error: 'Ce colis ne peut plus être annulé (il est déjà en cours de traitement)' });
    }
    if (shipment.payment_status === 'paid') {
      return res.status(400).json({ error: 'Ce colis a déjà été payé et ne peut pas être annulé ici' });
    }

    const scanResult = await pool.query(
      `SELECT process_shipment_scan($1, 'CANCELLED'::shipment_status, NULL, $2::text, 'client', NOW(), $3, true) AS r`,
      [trackingNumber, userId, 'Annulé par le client']
    );
    const r = scanResult.rows[0]?.r;
    if (!r?.success) {
      return res.status(400).json({ error: r?.error || 'Annulation impossible' });
    }
    await pool.query('UPDATE shipments SET updated_by = $1 WHERE id = $2', [userId, shipment.id]);

    res.json({ success: true, message: 'Colis annulé avec succès' });
  } catch (error: any) {
    console.error('Cancel shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Relay partner initiates return to sender for an already-received package
router.post('/:trackingNumber/relay-return', authenticate, requireRole('relay_partner', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipmentResult = await pool.query(
      'SELECT id, current_status, origin_relay_id FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    );
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }
    const shipment = shipmentResult.rows[0];

    if (shipment.current_status !== 'RELAY_ORIGIN_RECEIVED') {
      return res.status(400).json({ error: 'Ce colis ne peut être retourné que s\'il est réceptionné au relais d\'origine.' });
    }

    if (req.user!.role === 'relay_partner') {
      const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
      const userRelayId = relayResult.rows[0]?.relay_point_id;
      if (!userRelayId || String(userRelayId) !== String(shipment.origin_relay_id)) {
        return res.status(403).json({ error: 'Ce colis n\'est pas au point relais de votre structure.' });
      }
    }

    const scanResult = await pool.query(
      `SELECT process_shipment_scan($1, 'RETURN_TO_SENDER'::shipment_status, NULL, $2::text, 'relay', NOW(), $3, true) AS r`,
      [trackingNumber, req.user!.id, 'Retour expéditeur initié par le point relais']
    );
    const r = scanResult.rows[0]?.r;
    if (!r?.success) {
      return res.status(400).json({ error: r?.error || 'Retour impossible' });
    }
    await pool.query('UPDATE shipments SET updated_by = $1 WHERE id = $2', [req.user!.id, shipment.id]);

    res.json({ success: true, message: 'Retour expéditeur initié avec succès.' });
  } catch (error: any) {
    console.error('Relay return error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Relay partner reports an incident for a package at their relay
router.post('/:trackingNumber/relay-incident', authenticate, requireRole('relay_partner', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const { incident_type, description } = req.body;

    if (!incident_type || !description) {
      return res.status(400).json({ error: 'incident_type et description sont requis.' });
    }

    const validTypes = ['colis_endommage', 'client_absent', 'adresse_erronee', 'relais_ferme', 'autre'];
    if (!validTypes.includes(incident_type)) {
      return res.status(400).json({ error: 'Type d\'incident invalide.' });
    }

    const shipmentResult = await pool.query(
      'SELECT id, origin_relay_id, destination_relay_id FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    );
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }
    const shipment = shipmentResult.rows[0];

    if (req.user!.role === 'relay_partner') {
      const relayResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
      const userRelayId = String(relayResult.rows[0]?.relay_point_id);
      const atOrigin = String(shipment.origin_relay_id) === userRelayId;
      const atDest = String(shipment.destination_relay_id) === userRelayId;
      if (!atOrigin && !atDest) {
        return res.status(403).json({ error: 'Ce colis n\'est pas associé à votre point relais.' });
      }
    }

    await pool.query(
      `INSERT INTO shipment_incidents (shipment_id, tracking_number, relay_partner_id, incident_type, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [shipment.id, trackingNumber, req.user!.id, incident_type, description]
    );

    res.json({ success: true, message: 'Incident signalé avec succès.' });
  } catch (error: any) {
    console.error('Relay incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Receive shipment (for transporter pickup - triggers carrier pickup)
router.post('/:trackingNumber/receive', authenticate, requireRole('transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const { relay_id, shipment_code } = req.body;

    const shipRow = await pool.query(
      'SELECT shipment_code FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    );
    if (shipRow.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    if (req.user!.role === 'transporter') {
      const expected = (shipRow.rows[0].shipment_code || '').toString().trim().toUpperCase();
      const got = (shipment_code || '').toString().trim().toUpperCase();
      if (!got) {
        return res.status(400).json({ error: 'Code colis (shipment_code) requis — saisir le code inscrit sur l’étiquette' });
      }
      if (!expected || expected !== got) {
        return res.status(400).json({ error: 'Code colis incorrect' });
      }
    }
    
    // Get shipment
    const shipmentResult = await pool.query(
      `SELECT s.id, s.current_status, s.origin_relay_id, s.destination_relay_id,
              s.payment_method, s.payment_status, s.pickup_method
       FROM shipments s
       WHERE s.tracking_number = $1`,
      [trackingNumber]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];

    // Pour un ramassage à domicile avec paiement en espèces, le paiement doit être confirmé d'abord
    if (
      shipment.pickup_method === 'home_pickup' &&
      shipment.payment_method === 'relay_cash' &&
      shipment.payment_status !== 'paid'
    ) {
      return res.status(400).json({
        error: 'Veuillez confirmer la réception du paiement avant de valider l\'enlèvement de ce colis',
      });
    }

    const currentStatus = shipment.current_status;
    
    // Determine which relay to use
    const targetRelayId = relay_id || shipment.origin_relay_id || shipment.destination_relay_id;
    
    // Vérifier le statut actuel pour éviter les transitions invalides
    const normalizedStatus = (currentStatus || 'READY_FOR_DROP_OFF').toUpperCase();
    
    let finalStatus = normalizedStatus;
    let transitScan: any = null;
    
    // Si le colis est déjà en transit ou collecté, on ne fait rien
    if (normalizedStatus === 'IN_TRANSIT' || normalizedStatus === 'CARRIER_COLLECTED') {
      // Le colis est déjà en transit, pas besoin de transition
    } else {
      // Le colis n'est pas encore en transit, on fait la transition normale
      // Step 1: CARRIER_COLLECTED (si pas déjà fait)
      if (normalizedStatus !== 'CARRIER_COLLECTED') {
        const pickupResult = await pool.query(
          'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
          [trackingNumber, 'CARRIER_COLLECTED', targetRelayId, req.user!.id, 'transporter', new Date(), null, processScanBypassFromRole(req.user!.role)]
        );
        
        const pickupScan = pickupResult.rows[0].r;
        if (!pickupScan.success) {
          return res.status(400).json({ error: pickupScan.error });
        }
        finalStatus = 'CARRIER_COLLECTED';
      }
      
      // Step 2: IN_TRANSIT
      const transitResult = await pool.query(
        'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
        [trackingNumber, 'IN_TRANSIT', null, req.user!.id, 'transporter', new Date(), null, processScanBypassFromRole(req.user!.role)]
      );
      
      transitScan = transitResult.rows[0].r;
      if (!transitScan.success) {
        return res.status(400).json({ error: transitScan.error });
      }
      finalStatus = 'IN_TRANSIT';
    }
    
    // Lier le transporteur au colis pour que le relais de destination puisse le retrouver
    if (req.user!.role === 'transporter') {
      const tRes = await pool.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
      const tId = tRes.rows[0]?.id;
      if (tId) {
        await pool.query(
          'UPDATE shipments SET transporter_id = $1 WHERE id = $2',
          [tId, shipment.id]
        );
        await pool.query(
          `INSERT INTO transporter_assignments (transporter_id, shipment_id, relay_point_id, assignment_status, picked_up_at)
           VALUES ($1, $2, $3, 'picked_up', NOW())
           ON CONFLICT (transporter_id, shipment_id)
           DO UPDATE SET assignment_status = 'picked_up', picked_up_at = NOW()`,
          [tId, shipment.id, targetRelayId]
        );
      }
    }

    // Get updated shipment with all details for waybill
    const updatedShipment = await pool.query(
      `SELECT s.*,
              row_to_json(mmp.*) AS mobile_money_payment,
              row_to_json(rcp.*) AS relay_cash_payment
       FROM shipments s
       LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
       LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
       WHERE s.tracking_number = $1`,
      [trackingNumber]
    );

    res.json({
      success: true,
      shipment: updatedShipment.rows[0],
      new_status: transitScan?.new_status || finalStatus,
      message: normalizedStatus === 'IN_TRANSIT' || normalizedStatus === 'CARRIER_COLLECTED'
        ? 'Colis déjà en transit, aucune transition nécessaire'
        : 'Colis réceptionné avec succès'
    });
  } catch (error: any) {
    console.error('Receive shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deliver shipment to customer (with pickup code verification and optional payment collection)
router.post('/:trackingNumber/deliver', authenticate, requireRole('transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const { pickup_code, recipient_identifier, payment_collected, payment_method, payment_amount, phone_number } = req.body;

    // Get shipment
    const shipmentResult = await pool.query(
      `SELECT s.*,
              row_to_json(mmp.*) AS mobile_money_payment,
              row_to_json(rcp.*) AS relay_cash_payment
       FROM shipments s
       LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
       LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
       WHERE s.tracking_number = $1`,
      [trackingNumber]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }

    const shipment = shipmentResult.rows[0];

    // Vérifier le code de retrait pour toutes les livraisons (relais et domicile)
    if (!pickup_code) {
      return res.status(400).json({ error: 'Code de retrait requis' });
    }
    if (!shipment.pickup_code) {
      return res.status(400).json({ error: 'Le code de retrait n\'est pas encore disponible. Confirmez d\'abord la prise en charge du colis.' });
    }
    if ((shipment.pickup_code || '').trim() !== pickup_code.trim()) {
      return res.status(400).json({ error: 'Code de retrait invalide' });
    }
    
    // Verify recipient identifier if provided
    if (recipient_identifier) {
      const identifier = recipient_identifier.toString().trim();
      const matchesPhone = shipment.recipient_phone && shipment.recipient_phone.trim() === identifier;
      const matchesEmail = shipment.recipient_email && shipment.recipient_email.trim().toLowerCase() === identifier.toLowerCase();
      if (!matchesPhone && !matchesEmail) {
        return res.status(400).json({ error: 'Identifiant destinataire invalide' });
      }
    }
    
    // Handle payment collection if needed
    if (payment_collected && payment_method) {
      // Record payment if payment was collected during delivery
      if (payment_method === 'mobile_money') {
        // Create mobile money payment record
        // La table mobile_money_payments utilise payer_phone (pas phone_number) et nécessite un provider
        const provider = 'orange_money'; // Provider par défaut
        const phone = phone_number || shipment.recipient_phone;
        if (!phone) {
          return res.status(400).json({ error: 'Numéro de téléphone requis pour Mobile Money' });
        }
        
        
        await pool.query(
          `INSERT INTO mobile_money_payments (shipment_id, amount, payer_phone, provider, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'approved'::mobile_money_payment_status, NOW(), NOW())
           ON CONFLICT (shipment_id) 
           DO UPDATE SET 
             amount = EXCLUDED.amount, 
             payer_phone = EXCLUDED.payer_phone, 
             provider = EXCLUDED.provider, 
             status = 'approved'::mobile_money_payment_status, 
             updated_at = NOW()`,
          [shipment.id, payment_amount || shipment.price, phone, provider]
        );
      } else if (payment_method === 'cash') {
        // Create relay cash payment record (paiement collecté par le transporteur lors de la livraison)
        await pool.query(
          `INSERT INTO relay_cash_payments (shipment_id, amount_expected, amount_collected, status, collected_by, collected_at, collection_location, created_at, updated_at)
           VALUES ($1, $2, $2, 'collected', $3, NOW(), 'transporter', NOW(), NOW())
           ON CONFLICT (shipment_id) 
           DO UPDATE SET amount_expected = COALESCE(relay_cash_payments.amount_expected, $2), amount_collected = $2, status = 'collected', collected_by = $3, collected_at = NOW(), collection_location = 'transporter', updated_at = NOW()`,
          [shipment.id, payment_amount || shipment.price, req.user!.id]
        );
      }
      
      // Update payment status
      await pool.query(
        'UPDATE shipments SET payment_status = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
        ['paid', req.user!.id, shipment.id]
      );
    }
    
    // Determine delivery status based on delivery type
    let deliveryStatus: string;
    if (shipment.home_delivery) {
      deliveryStatus = 'DELIVERED_TO_CUSTOMER';
    } else {
      deliveryStatus = 'PICKED_UP_BY_CUSTOMER';
    }
    
    // Pour les colis avec ramassage à domicile (origin_relay_id NULL), 
    // on doit passer par CARRIER_COLLECTED puis IN_TRANSIT avant DELIVERED_TO_CUSTOMER
    // Sinon, on doit passer par IN_TRANSIT d'abord
    const currentStatus = shipment.current_status || 'READY_FOR_DROP_OFF';
    
    // Si le colis est en READY_FOR_DROP_OFF et qu'on veut le livrer (home_delivery),
    // on doit d'abord le mettre en CARRIER_COLLECTED puis IN_TRANSIT puis DELIVERED_TO_CUSTOMER
    if (currentStatus === 'READY_FOR_DROP_OFF' && deliveryStatus === 'DELIVERED_TO_CUSTOMER') {
      // Étape 1: Mettre en CARRIER_COLLECTED (transporteur ramasse le colis)
      const collectedResult = await pool.query(
        'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
        [trackingNumber, 'CARRIER_COLLECTED', null, req.user!.id, 'transporter', new Date(), 'Colis ramassé par le transporteur', processScanBypassFromRole(req.user!.role)]
      );
      
      const collectedScanResult = collectedResult.rows[0].r;
      if (!collectedScanResult.success) {
        // Continuer quand même, peut-être que le colis est déjà en transit
      }
      
      // Étape 2: Mettre en IN_TRANSIT
      const transitResult = await pool.query(
        'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
        [trackingNumber, 'IN_TRANSIT', null, req.user!.id, 'transporter', new Date(), 'Colis en transit pour livraison', processScanBypassFromRole(req.user!.role)]
      );
      
      const transitScanResult = transitResult.rows[0].r;
      if (!transitScanResult.success) {
        // Si le colis est déjà en transit, continuer
        const currentShipment = await pool.query('SELECT current_status FROM shipments WHERE tracking_number = $1', [trackingNumber]);
        if (currentShipment.rows[0]?.current_status !== 'IN_TRANSIT') {
          return res.status(400).json({ error: transitScanResult.error || 'Impossible de mettre le colis en transit' });
        }
      }
    }
    
    // Update shipment status to final delivery status
    const result = await pool.query(
      'SELECT process_shipment_scan($1,$2,$3,$4,$5,$6,$7,$8) as r',
      [trackingNumber, deliveryStatus, null, req.user!.id, 'transporter', new Date(), 'Livré avec succès', processScanBypassFromRole(req.user!.role)]
    );
    
    const scanResult = result.rows[0].r;
    if (!scanResult.success) {
      return res.status(400).json({ error: scanResult.error || 'Erreur lors de la livraison' });
    }

    // Crédit du portefeuille livreur à la livraison (parité avec /handoffs/scan).
    // creditTransporterWallet est idempotent (garde anti-double-crédit), donc sûr même
    // si un autre chemin a déjà crédité ce colis.
    let walletTransporterId: string | null = shipment.transporter_id || null;
    if (req.user!.role === 'transporter') {
      const tRes = await pool.query('SELECT id FROM transporters WHERE user_id = $1', [req.user!.id]);
      walletTransporterId = tRes.rows[0]?.id || walletTransporterId;
    }
    if (walletTransporterId) {
      dispatchService.creditTransporterWallet(shipment.id, walletTransporterId)
        .catch((err: any) => console.error('Wallet credit error (deliver):', err.message));
    }

    // Update pickup code verification
    await pool.query(
      `UPDATE shipments
       SET pickup_code_verified_at = NOW(),
           pickup_code_verified_by = $1
       WHERE id = $2`,
      [req.user!.id, shipment.id]
    );
    
    // Get updated shipment with proper status
    const updatedShipment = await pool.query(
      `SELECT s.*, 
              row_to_json(mmp.*) AS mobile_money_payment,
              row_to_json(rcp.*) AS relay_cash_payment,
              s.current_status as new_status
       FROM shipments s
       LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
       LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
       WHERE s.tracking_number = $1`,
      [trackingNumber]
    );
    
    res.json({ 
      success: true, 
      message: 'Colis livré avec succès',
      shipment: updatedShipment.rows[0],
      new_status: scanResult.new_status
    });
  } catch (error: any) {
    console.error('Deliver shipment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Collect payment on delivery
router.post('/:trackingNumber/collect-payment', authenticate, requireRole('transporter', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { trackingNumber } = req.params;
    const { payment_method, payment_amount, phone_number } = req.body;
    
    if (!payment_method || !payment_amount) {
      return res.status(400).json({ error: 'Méthode de paiement et montant requis' });
    }
    
    // Get shipment
    const shipmentResult = await pool.query(
      'SELECT id, price, recipient_phone FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    );
    
    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable' });
    }
    
    const shipment = shipmentResult.rows[0];
    
    // Record payment
    if (payment_method === 'mobile_money') {
      const phone = phone_number || shipment.recipient_phone;
      if (!phone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis pour Mobile Money' });
      }
      
      // La table mobile_money_payments utilise payer_phone (pas phone_number) et nécessite un provider
      // Utiliser un provider par défaut si non spécifié
      const provider = 'orange_money'; // Provider par défaut, peut être modifié selon les besoins
      
      await pool.query(
        `INSERT INTO mobile_money_payments (shipment_id, amount, payer_phone, provider, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'approved'::mobile_money_payment_status, NOW(), NOW())
         ON CONFLICT (shipment_id) 
         DO UPDATE SET amount = $2, payer_phone = $3, provider = $4, status = 'approved'::mobile_money_payment_status, updated_at = NOW()`,
        [shipment.id, payment_amount, phone, provider]
      );
    } else if (payment_method === 'cash') {
      // Paiement collecté par le transporteur lors de la prise en charge
      await pool.query(
        `INSERT INTO relay_cash_payments (shipment_id, amount_collected, status, collected_by, collected_at, collection_location, created_at, updated_at)
         VALUES ($1, $2, 'collected', $3, NOW(), 'transporter', NOW(), NOW())
         ON CONFLICT (shipment_id) 
         DO UPDATE SET amount_collected = $2, status = 'collected', collected_by = $3, collected_at = NOW(), collection_location = 'transporter', updated_at = NOW()`,
        [shipment.id, payment_amount, req.user!.id]
      );
    } else {
      return res.status(400).json({ error: 'Méthode de paiement non supportée' });
    }
    
    // Update payment status
    await pool.query(
      'UPDATE shipments SET payment_status = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
      ['paid', req.user!.id, shipment.id]
    );
    
    res.json({ 
      success: true, 
      message: 'Paiement enregistré avec succès',
      payment_method,
      payment_amount
    });
  } catch (error: any) {
    console.error('Collect payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

