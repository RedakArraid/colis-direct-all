import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../db/connection';
import { apiKeyAuth, requireScope, ApiKeyRequest } from '../middleware/apiKeyAuth';

const router = express.Router();

// Public root — no auth required
router.get('/', (_req: Request, res: Response) => {
  res.json({
    version: '1.0',
    status: 'ok',
    docs: 'https://api.colisdirect.com/docs',
  });
});

// Apply API key auth to all subsequent routes
router.use(apiKeyAuth);

// ---------------------------------------------------------------------------
// TRACKING
// ---------------------------------------------------------------------------

router.get(
  '/tracking/:number',
  requireScope('tracking:read'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { number } = req.params;
      const normalizedInput = number.trim().toUpperCase();

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
        `SELECT s.id, s.tracking_number, s.shipment_code, s.pickup_code, s.current_status, s.payment_status,
                s.sender_first_name, s.sender_last_name, s.sender_phone,
                s.sender_address, s.sender_commune, s.sender_quartier,
                s.recipient_first_name, s.recipient_last_name, s.recipient_phone,
                s.recipient_address, s.recipient_commune, s.recipient_quartier,
                s.package_type, s.weight, s.home_delivery,
                s.origin_relay_id, s.destination_relay_id,
                s.price, s.payment_method, s.created_at, s.updated_at,
                CASE
                  WHEN s.payment_method = 'relay_cash'
                    AND (s.payment_status = 'paid' OR COALESCE(rcp.status::text, '') = 'collected')
                    THEN 'PAYMENT_RECEIVED_AT_RELAY'
                  WHEN s.payment_method = 'relay_cash'
                    THEN 'PAYMENT_PENDING_AT_RELAY'
                  WHEN s.payment_method = 'mobile_money' AND COALESCE(mmp.status::text, '') = 'rejected'
                    THEN 'PAYMENT_REJECTED'
                  WHEN s.payment_method = 'mobile_money'
                    AND s.payment_status = 'pending'
                    AND (s.current_status IS NULL OR s.current_status = 'READY_FOR_DROP_OFF'::shipment_status)
                    THEN 'PAYMENT_AWAITING_VALIDATION'
                  WHEN s.payment_method = 'mobile_money'
                    AND s.payment_status = 'paid'
                    AND (s.current_status IS NULL OR s.current_status = 'READY_FOR_DROP_OFF'::shipment_status)
                    THEN 'PAYMENT_CONFIRMED_AWAITING_DROP'
                  WHEN s.payment_method IN ('paystack', 'cinetpay')
                    AND s.payment_status = 'pending'
                    AND (s.current_status IS NULL OR s.current_status = 'READY_FOR_DROP_OFF'::shipment_status)
                    THEN 'PAYMENT_AWAITING_VALIDATION'
                  WHEN s.payment_method IN ('paystack', 'cinetpay')
                    AND s.payment_status = 'paid'
                    AND (s.current_status IS NULL OR s.current_status = 'READY_FOR_DROP_OFF'::shipment_status)
                    THEN 'PAYMENT_CONFIRMED_AWAITING_DROP'
                  ELSE COALESCE(s.current_status::text, 'READY_FOR_DROP_OFF')
                END AS effective_status,
                o.name AS origin_relay_name, o.commune AS origin_relay_commune, o.address AS origin_relay_address,
                d.name AS destination_relay_name, d.commune AS destination_relay_commune, d.address AS destination_relay_address
         FROM shipments s
         LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
         LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
         LEFT JOIN relay_points o ON s.origin_relay_id = o.id
         LEFT JOIN relay_points d ON s.destination_relay_id = d.id
         WHERE ${whereClause}`,
        [searchValue]
      );

      if (shipmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Envoi introuvable' });
      }

      const shipment = shipmentResult.rows[0];

      // Try tracking_events first, fallback to shipment_history
      let events: any[] = [];
      try {
        const eventsResult = await pool.query(
          `SELECT status, location_id, scanner_type, notes, timestamp AS occurred_at
           FROM tracking_events
           WHERE shipment_id = $1
           ORDER BY timestamp ASC`,
          [shipment.id]
        );
        events = eventsResult.rows;
      } catch {
        try {
          const historyResult = await pool.query(
            `SELECT status, notes, created_at AS occurred_at
             FROM shipment_history
             WHERE shipment_id = $1
             ORDER BY created_at ASC`,
            [shipment.id]
          );
          events = historyResult.rows;
        } catch {
          events = [];
        }
      }

      return res.json({
        tracking_number: shipment.tracking_number,
        shipment_code: shipment.shipment_code,
        pickup_code: isPickupCode ? shipment.pickup_code : undefined,
        current_status: shipment.current_status,
        effective_status: shipment.effective_status,
        payment_status: shipment.payment_status,
        sender: {
          first_name: shipment.sender_first_name,
          last_name: shipment.sender_last_name,
          phone: shipment.sender_phone,
          address: shipment.sender_address,
          commune: shipment.sender_commune,
          quartier: shipment.sender_quartier,
        },
        recipient: {
          first_name: shipment.recipient_first_name,
          last_name: shipment.recipient_last_name,
          phone: shipment.recipient_phone,
          address: shipment.recipient_address,
          commune: shipment.recipient_commune,
          quartier: shipment.recipient_quartier,
        },
        package: {
          type: shipment.package_type,
          weight_kg: shipment.weight,
        },
        delivery: {
          mode: shipment.home_delivery ? 'home' : 'relay',
          origin_relay: shipment.origin_relay_name
            ? {
                id: shipment.origin_relay_id,
                name: shipment.origin_relay_name,
                commune: shipment.origin_relay_commune,
                address: shipment.origin_relay_address,
              }
            : null,
          destination_relay: shipment.destination_relay_name
            ? {
                id: shipment.destination_relay_id,
                name: shipment.destination_relay_name,
                commune: shipment.destination_relay_commune,
                address: shipment.destination_relay_address,
              }
            : null,
        },
        pricing: {
          total: shipment.price,
          currency: 'FCFA',
          payment_method: shipment.payment_method,
        },
        events,
        created_at: shipment.created_at,
        updated_at: shipment.updated_at,
      });
    } catch (error: any) {
      console.error('[API V1] tracking error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ---------------------------------------------------------------------------
// SHIPMENTS
// ---------------------------------------------------------------------------

router.get(
  '/shipments/:id',
  requireScope('shipments:read'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT s.id, s.tracking_number, s.shipment_code, s.current_status,
                s.payment_status, s.payment_method,
                s.sender_first_name, s.sender_last_name, s.sender_email, s.sender_phone,
                s.sender_address, s.sender_commune, s.sender_quartier,
                s.recipient_first_name, s.recipient_last_name, s.recipient_email, s.recipient_phone,
                s.recipient_address, s.recipient_commune, s.recipient_quartier,
                s.package_type, s.weight, s.home_delivery,
                s.origin_relay_id, s.destination_relay_id,
                s.price, s.created_at, s.updated_at
         FROM shipments s
         WHERE s.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Envoi introuvable' });
      }

      return res.json(result.rows[0]);
    } catch (error: any) {
      console.error('[API V1] shipment detail error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

router.post(
  '/shipments',
  requireScope('shipments:create'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { sender, recipient, package: pkg, delivery, payment_method } = req.body;

      if (!sender || !recipient || !pkg || !delivery || !payment_method) {
        return res.status(400).json({ error: 'Corps de requête incomplet' });
      }

      // Generate tracking number: try SQL function first, fallback to timestamp
      let trackingNumber: string;
      try {
        const tnResult = await pool.query(
          'SELECT generate_tracking_number() AS tn'
        );
        trackingNumber = tnResult.rows[0].tn;
      } catch {
        trackingNumber = 'CD' + Date.now();
      }

      const result = await pool.query(
        `INSERT INTO shipments (
           tracking_number,
           sender_first_name, sender_last_name, sender_email, sender_phone,
           sender_address, sender_commune, sender_quartier,
           recipient_first_name, recipient_last_name, recipient_email, recipient_phone,
           recipient_address, recipient_commune, recipient_quartier,
           package_type, weight,
           home_delivery, origin_relay_id, destination_relay_id,
           payment_method, current_status, created_at, updated_at
         ) VALUES (
           $1,
           $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13, $14, $15,
           $16, $17,
           $18, $19, $20,
           $21, 'READY_FOR_DROP_OFF', NOW(), NOW()
         )
         RETURNING id, tracking_number, current_status AS status, created_at`,
        [
          trackingNumber,
          sender.first_name, sender.last_name, sender.email || null, sender.phone,
          sender.address || null, sender.commune || null, sender.quartier || null,
          recipient.first_name, recipient.last_name, recipient.email || null, recipient.phone,
          recipient.address || null, recipient.commune || null, recipient.quartier || null,
          pkg.type, pkg.weight_kg,
          delivery.mode === 'home',
          delivery.origin_relay_id || null,
          delivery.destination_relay_id || null,
          payment_method,
        ]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('[API V1] create shipment error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ---------------------------------------------------------------------------
// PRICING
// ---------------------------------------------------------------------------

router.get(
  '/pricing',
  requireScope('pricing:read'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { type, weight_kg, delivery_mode, package_size } = req.query as Record<string, string>;

      if (!type || !weight_kg || !delivery_mode) {
        return res.status(400).json({
          error: 'Paramètres requis : type, weight_kg, delivery_mode',
        });
      }

      const weight = parseFloat(weight_kg);
      if (isNaN(weight)) {
        return res.status(400).json({ error: 'weight_kg doit être un nombre' });
      }

      // grid_type = 'colis' ou 'courrier', package_size = 'petit'|'moyen'|'grand'
      // delivery_mode = 'relay'|'home'
      // Le prix est price_intra_commune ou price_inter_commune selon le mode
      const result = await pool.query(
        `SELECT price_intra_commune, price_inter_commune, supplement_per_kg_intra, supplement_per_kg_inter,
                weight_min, weight_max
         FROM pricing_grids
         WHERE (grid_type = $1 OR $1 IS NULL)
           AND delivery_mode = $2
           AND $3::numeric >= weight_min
           AND $3::numeric <= weight_max
           AND (package_size = $4 OR package_size IS NULL OR $4 IS NULL)
           AND is_active = true
         ORDER BY weight_min ASC
         LIMIT 1`,
        [type || null, delivery_mode, weight, package_size || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Aucun tarif trouvé pour ces critères' });
      }

      const row = result.rows[0];
      const basePrice = parseFloat(row.price_intra_commune);
      const supplement = parseFloat(row.supplement_per_kg_intra || '0');
      // Calcul du prix total selon le poids
      const weightAboveMin = Math.max(0, weight - parseFloat(row.weight_min));
      const totalPrice = basePrice + supplement * weightAboveMin;

      return res.json({
        base_price: basePrice,
        total_price: Math.round(totalPrice),
        currency: 'FCFA',
        weight_min: parseFloat(row.weight_min),
        weight_max: parseFloat(row.weight_max),
        delivery_mode,
      });
    } catch (error: any) {
      console.error('[API V1] pricing error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ---------------------------------------------------------------------------
// RELAY POINTS
// ---------------------------------------------------------------------------

router.get(
  '/relay-points',
  requireScope('relay_points:read'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { commune, search } = req.query as Record<string, string>;

      let query = `SELECT id, name, address, commune, quartier, phone, latitude, longitude, has_printer
                   FROM relay_points
                   WHERE is_active = true`;
      const params: any[] = [];
      let paramCount = 0;

      if (commune) {
        query += ` AND commune = $${++paramCount}`;
        params.push(commune);
      }

      if (search) {
        query += ` AND (name ILIKE $${++paramCount} OR address ILIKE $${paramCount} OR quartier ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY name ASC';

      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (error: any) {
      console.error('[API V1] relay points list error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

router.get(
  '/relay-points/:id',
  requireScope('relay_points:read'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, name, address, commune, quartier, phone, latitude, longitude, has_printer, hours
         FROM relay_points
         WHERE id = $1 AND is_active = true`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Point relais introuvable' });
      }

      return res.json(result.rows[0]);
    } catch (error: any) {
      console.error('[API V1] relay point detail error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ---------------------------------------------------------------------------
// WEBHOOKS
// ---------------------------------------------------------------------------

router.get(
  '/webhooks',
  requireScope('webhooks:manage'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, url, events, is_active, failure_count, last_triggered_at, created_at
         FROM api_webhooks
         WHERE api_key_id = $1
         ORDER BY created_at DESC`,
        [req.apiKey!.id]
      );
      return res.json(result.rows);
    } catch (error: any) {
      console.error('[API V1] list webhooks error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

router.post(
  '/webhooks',
  requireScope('webhooks:manage'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const { url, events } = req.body;

      if (!url || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'url et events sont requis' });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'URL invalide' });
      }

      const signingSecret = crypto.randomBytes(32).toString('hex');

      const result = await pool.query(
        `INSERT INTO api_webhooks (api_key_id, url, events, signing_secret, is_active, failure_count, created_at)
         VALUES ($1, $2, $3, $4, true, 0, NOW())
         RETURNING id, url, events, created_at`,
        [req.apiKey!.id, url, events, signingSecret]
      );

      return res.status(201).json({
        ...result.rows[0],
        signing_secret: signingSecret, // Shown only once
      });
    } catch (error: any) {
      console.error('[API V1] create webhook error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

router.delete(
  '/webhooks/:id',
  requireScope('webhooks:manage'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const result = await pool.query(
        `DELETE FROM api_webhooks
         WHERE id = $1 AND api_key_id = $2
         RETURNING id`,
        [req.params.id, req.apiKey!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Webhook introuvable ou accès non autorisé' });
      }

      return res.json({ message: 'Webhook supprimé avec succès' });
    } catch (error: any) {
      console.error('[API V1] delete webhook error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

export default router;
