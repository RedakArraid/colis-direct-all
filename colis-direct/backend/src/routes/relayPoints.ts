import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';

const router = express.Router();

// Get all relay points
router.get('/', async (req, res) => {
  try {
    const { commune, is_active, zone_id } = req.query;
    let query = `SELECT rp.*, dz.name as zone_name 
                 FROM relay_points rp 
                 LEFT JOIN delivery_zones dz ON rp.zone_id = dz.id 
                 WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 0;

    if (commune) {
      query += ` AND rp.commune = $${++paramCount}`;
      params.push(commune);
    }

    if (is_active !== undefined) {
      query += ` AND rp.is_active = $${++paramCount}`;
      params.push(is_active === 'true');
    }

    if (zone_id) {
      query += ` AND rp.zone_id = $${++paramCount}`;
      params.push(zone_id);
    }

    query += ' ORDER BY rp.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get relay points error:', error);
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: /me must be defined BEFORE /:id routes to avoid route conflicts
// Get current relay point profile with code (for relay_partner)
router.get('/me', authenticate, requireRole('relay_partner'), async (req: AuthRequest, res) => {
  try {
    const userResult = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
    const relayId = userResult.rows[0]?.relay_point_id;
    
    if (!relayId) {
      return res.status(404).json({ error: 'Point relais non associé à votre compte' });
    }
    
    const relayResult = await pool.query(
      `SELECT rp.*, dz.name as zone_name 
       FROM relay_points rp 
       LEFT JOIN delivery_zones dz ON rp.zone_id = dz.id 
       WHERE rp.id = $1`,
      [relayId]
    );
    
    if (relayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Point relais non trouvé' });
    }
    
    res.json(relayResult.rows[0]);
  } catch (error: any) {
    console.error('Get relay point profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: /:id/stats must be defined BEFORE /:id to avoid route conflicts
router.get('/:id/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const relayId = req.params.id;
    const user = req.user!;

    const allowedRoles = new Set(['admin', 'support', 'relay_partner']);
    if (!allowedRoles.has(user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (user.role === 'relay_partner') {
      const ownership = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [user.id]);
      const myRelayId = ownership.rows[0]?.relay_point_id;
      if (!myRelayId || String(myRelayId).toLowerCase() !== relayId.toLowerCase()) {
        return res.status(403).json({ error: 'Vous ne pouvez consulter que les statistiques de votre point relais' });
      }
    }

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (typeof value === 'bigint') return Number(value);
      return 0;
    };

    const parsePaymentBreakdown = (data: unknown) => {
      if (!data) return {} as Record<string, { count: number; amount: number }>;
      let payload: any = data;
      if (typeof data === 'string') {
        try {
          payload = JSON.parse(data);
        } catch {
          return {} as Record<string, { count: number; amount: number }>;
        }
      }
      if (typeof payload !== 'object' || payload === null) {
        return {} as Record<string, { count: number; amount: number }>;
      }
      const result: Record<string, { count: number; amount: number }> = {};
      Object.entries(payload as Record<string, any>).forEach(([method, info]) => {
        const rawCount = Number((info as any)?.count ?? 0);
        const rawAmount = Number((info as any)?.amount ?? 0);
        result[method] = {
          count: Number.isFinite(rawCount) ? rawCount : 0,
          amount: Number.isFinite(rawAmount) ? rawAmount : 0,
        };
      });
      return result;
    };

    const parseFinancialRow = (row: any) => ({
      revenue: toNumber(row?.revenue_total),
      shipments: toNumber(row?.shipments_total),
      shipmentsPaid: toNumber(row?.shipments_paid),
      assistedCount: toNumber(row?.assisted_count),
      assistanceRevenue: toNumber(row?.assistance_revenue),
      printingRevenue: toNumber(row?.printing_revenue),
      commissions: toNumber(row?.commissions_total),
      homeDeliveryCount: toNumber(row?.home_delivery_count),
      relayDeliveryCount: toNumber(row?.relay_delivery_count),
      paymentBreakdown: parsePaymentBreakdown(row?.payment_breakdown),
    });

    const metricsResult = await pool.query(
      `WITH shipments_for_relay AS (
         SELECT *,
               UPPER(
                 COALESCE(
                   NULLIF(current_status::text, ''),
                   NULLIF(status::text, ''),
                   'UNKNOWN'
                 )
               ) AS normalized_status,
                COALESCE(updated_at, created_at) AS last_timestamp
         FROM shipments
         WHERE origin_relay_id = $1 OR destination_relay_id = $1
       )
       SELECT
         COALESCE(SUM(CASE WHEN origin_relay_id = $1 AND normalized_status = 'READY_FOR_DROP_OFF' THEN 1 ELSE 0 END), 0)::int AS pending_pickups,
         COALESCE(SUM(CASE WHEN destination_relay_id = $1 AND normalized_status IN ('IN_TRANSIT','CARRIER_COLLECTED','RELAY_FINAL_RECEIVED','AVAILABLE_FOR_PICKUP') THEN 1 ELSE 0 END), 0)::int AS pending_deliveries,
         COALESCE(SUM(CASE WHEN normalized_status IN ('DELIVERED','DELIVERED_TO_CUSTOMER','PICKED_UP_BY_CUSTOMER')
                            AND DATE(last_timestamp) = CURRENT_DATE
                            THEN 1 ELSE 0 END), 0)::int AS completed_today
       FROM shipments_for_relay`,
      [relayId]
    );

    const row = metricsResult.rows[0] || {};
    const stats = {
      pending_pickups: toNumber(row.pending_pickups),
      pending_deliveries: toNumber(row.pending_deliveries),
      completed_today: toNumber(row.completed_today),
    };

    // Ensure today's aggregates are up to date before reading cached values
    await pool.query('SELECT refresh_relay_daily_metrics($1, CURRENT_DATE)', [relayId]);

    const financialTodayResult = await pool.query(
      `WITH base AS (
         SELECT *
         FROM relay_point_daily_metrics
         WHERE relay_point_id = $1
           AND metric_date = CURRENT_DATE
       ),
       payment_data AS (
         SELECT
           key AS method,
           SUM((value->>'count')::int) AS total_count,
           SUM((value->>'amount')::numeric) AS total_amount
         FROM base
         CROSS JOIN jsonb_each(base.payment_breakdown)
         GROUP BY key
       )
       SELECT
         COALESCE(SUM(base.revenue_total), 0) AS revenue_total,
         COALESCE(SUM(base.shipments_total), 0) AS shipments_total,
         COALESCE(SUM(base.shipments_paid), 0) AS shipments_paid,
         COALESCE(SUM(base.assisted_count), 0) AS assisted_count,
         COALESCE(SUM(base.assistance_revenue), 0) AS assistance_revenue,
         COALESCE(SUM(base.printing_revenue), 0) AS printing_revenue,
         COALESCE(SUM(base.commissions_total), 0) AS commissions_total,
         COALESCE(SUM(base.home_delivery_count), 0) AS home_delivery_count,
         COALESCE(SUM(base.relay_delivery_count), 0) AS relay_delivery_count,
         COALESCE(
           (SELECT jsonb_object_agg(method, jsonb_build_object('count', total_count, 'amount', total_amount))
            FROM payment_data),
           '{}'::jsonb
         ) AS payment_breakdown
       FROM base`,
      [relayId]
    );

    const financialWeekResult = await pool.query(
      `WITH range AS (
         SELECT date_trunc('week', CURRENT_DATE)::date AS start_date,
                CURRENT_DATE AS end_date
       ),
       base AS (
         SELECT m.*
         FROM relay_point_daily_metrics m
         JOIN range r ON m.metric_date BETWEEN r.start_date AND r.end_date
         WHERE m.relay_point_id = $1
       ),
       payment_data AS (
         SELECT
           key AS method,
           SUM((value->>'count')::int) AS total_count,
           SUM((value->>'amount')::numeric) AS total_amount
         FROM base
         CROSS JOIN jsonb_each(base.payment_breakdown)
         GROUP BY key
       )
       SELECT
         COALESCE(SUM(base.revenue_total), 0) AS revenue_total,
         COALESCE(SUM(base.shipments_total), 0) AS shipments_total,
         COALESCE(SUM(base.shipments_paid), 0) AS shipments_paid,
         COALESCE(SUM(base.assisted_count), 0) AS assisted_count,
         COALESCE(SUM(base.assistance_revenue), 0) AS assistance_revenue,
         COALESCE(SUM(base.printing_revenue), 0) AS printing_revenue,
         COALESCE(SUM(base.commissions_total), 0) AS commissions_total,
         COALESCE(SUM(base.home_delivery_count), 0) AS home_delivery_count,
         COALESCE(SUM(base.relay_delivery_count), 0) AS relay_delivery_count,
         COALESCE(
           (SELECT jsonb_object_agg(method, jsonb_build_object('count', total_count, 'amount', total_amount))
            FROM payment_data),
           '{}'::jsonb
         ) AS payment_breakdown
       FROM base`,
      [relayId]
    );

    const financialMonthResult = await pool.query(
      `WITH range AS (
         SELECT date_trunc('month', CURRENT_DATE)::date AS start_date,
                CURRENT_DATE AS end_date
       ),
       base AS (
         SELECT m.*
         FROM relay_point_daily_metrics m
         JOIN range r ON m.metric_date BETWEEN r.start_date AND r.end_date
         WHERE m.relay_point_id = $1
       ),
       payment_data AS (
         SELECT
           key AS method,
           SUM((value->>'count')::int) AS total_count,
           SUM((value->>'amount')::numeric) AS total_amount
         FROM base
         CROSS JOIN jsonb_each(base.payment_breakdown)
         GROUP BY key
       )
       SELECT
         COALESCE(SUM(base.revenue_total), 0) AS revenue_total,
         COALESCE(SUM(base.shipments_total), 0) AS shipments_total,
         COALESCE(SUM(base.shipments_paid), 0) AS shipments_paid,
         COALESCE(SUM(base.assisted_count), 0) AS assisted_count,
         COALESCE(SUM(base.assistance_revenue), 0) AS assistance_revenue,
         COALESCE(SUM(base.printing_revenue), 0) AS printing_revenue,
         COALESCE(SUM(base.commissions_total), 0) AS commissions_total,
         COALESCE(SUM(base.home_delivery_count), 0) AS home_delivery_count,
         COALESCE(SUM(base.relay_delivery_count), 0) AS relay_delivery_count,
         COALESCE(
           (SELECT jsonb_object_agg(method, jsonb_build_object('count', total_count, 'amount', total_amount))
            FROM payment_data),
           '{}'::jsonb
         ) AS payment_breakdown
       FROM base`,
      [relayId]
    );

    const financials = {
      today: parseFinancialRow(financialTodayResult.rows[0] ?? {}),
      week: parseFinancialRow(financialWeekResult.rows[0] ?? {}),
      month: parseFinancialRow(financialMonthResult.rows[0] ?? {}),
    };

    const monthlyRevenueFinal = financials.month.revenue;

    await pool.query(
      `INSERT INTO relay_point_metrics (relay_point_id, pending_pickups, pending_deliveries, completed_today, monthly_revenue, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (relay_point_id) DO UPDATE SET
         pending_pickups = EXCLUDED.pending_pickups,
         pending_deliveries = EXCLUDED.pending_deliveries,
         completed_today = EXCLUDED.completed_today,
         monthly_revenue = EXCLUDED.monthly_revenue,
         updated_at = NOW()`,
      [relayId, stats.pending_pickups, stats.pending_deliveries, stats.completed_today, monthlyRevenueFinal]
    );

    const persisted = await pool.query(
      `SELECT pending_pickups, pending_deliveries, completed_today, monthly_revenue, updated_at
       FROM relay_point_metrics
       WHERE relay_point_id = $1`,
      [relayId]
    );

    const persistedRow = persisted.rows[0];
    res.json({
      pending_pickups: toNumber(persistedRow?.pending_pickups ?? stats.pending_pickups),
      pending_deliveries: toNumber(persistedRow?.pending_deliveries ?? stats.pending_deliveries),
      completed_today: toNumber(persistedRow?.completed_today ?? stats.completed_today),
      monthly_revenue: toNumber(persistedRow?.monthly_revenue ?? monthlyRevenueFinal),
      updated_at: persistedRow?.updated_at || new Date().toISOString(),
      financials,
    });
  } catch (error: any) {
    console.error('Get relay point stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active shipments for a relay point (server-side filtered, uses partial composite indexes)
router.get('/:id/active-shipments', authenticate, async (req: AuthRequest, res) => {
  try {
    const relayId = req.params.id;
    const user = req.user!;

    if (!['admin', 'support', 'relay_partner'].includes(user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (user.role === 'relay_partner') {
      const ownership = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [user.id]);
      const myRelayId = ownership.rows[0]?.relay_point_id;
      if (!myRelayId || String(myRelayId).toLowerCase() !== relayId.toLowerCase()) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }

    const result = await pool.query(`
      SELECT s.*,
        row_to_json(mmp.*) AS mobile_money_payment,
        row_to_json(rcp.*) AS relay_cash_payment,
        shipment_effective_status(s.current_status::text, s.payment_method, s.payment_status, COALESCE(mmp.status::text, ''), COALESCE(rcp.status::text, '')) AS effective_status,
        rp_dest.zone_id AS delivery_zone_id,
        dz.name AS delivery_zone_name
      FROM shipments s
      LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
      LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
      LEFT JOIN relay_points rp_dest ON s.destination_relay_id = rp_dest.id
      LEFT JOIN delivery_zones dz ON rp_dest.zone_id = dz.id
      WHERE (
        (s.origin_relay_id = $1 AND s.current_status = ANY(ARRAY[
          'RELAY_ORIGIN_RECEIVED'::shipment_status,
          'PICKUP_PENDING'::shipment_status,
          'PAYMENT_PENDING_AT_RELAY'::shipment_status,
          'PAYMENT_RECEIVED_AT_RELAY'::shipment_status,
          'PAYMENT_AWAITING_VALIDATION'::shipment_status,
          'PAYMENT_VALIDATED'::shipment_status
        ]))
        OR
        (s.destination_relay_id = $1 AND s.current_status = ANY(ARRAY[
          'RELAY_FINAL_RECEIVED'::shipment_status,
          'AVAILABLE_FOR_PICKUP'::shipment_status
        ]))
      )
      ORDER BY s.created_at DESC
    `, [relayId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get relay active shipments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get relay point by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM relay_points WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relay point not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get relay point error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create relay point (admin only)
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {

    const {
      name,
      type,
      commune,
      quartier,
      address,
      phone,
      whatsapp,
      hours,
      latitude,
      longitude,
      zone_id,
      is_active = true,
      printing_fee,
      assistance_fee,
    } = req.body;

    // Basic validation
    const validateNumber = (v: any) => v === null || v === undefined || typeof v === 'number' || !isNaN(parseFloat(v));
    if (printing_fee !== undefined && (!validateNumber(printing_fee) || Number(printing_fee) < 0)) {
      return res.status(400).json({ error: 'Invalid printing_fee' });
    }
    if (assistance_fee !== undefined && (!validateNumber(assistance_fee) || Number(assistance_fee) < 0)) {
      return res.status(400).json({ error: 'Invalid assistance_fee' });
    }
    if (latitude !== undefined && latitude !== null) {
      const lat = Number(latitude);
      if (!validateNumber(latitude) || lat < -90 || lat > 90) return res.status(400).json({ error: 'Invalid latitude' });
    }
    if (longitude !== undefined && longitude !== null) {
      const lon = Number(longitude);
      if (!validateNumber(longitude) || lon < -180 || lon > 180) return res.status(400).json({ error: 'Invalid longitude' });
    }

    const result = await pool.query(
      `INSERT INTO relay_points (name, type, commune, quartier, address, phone, whatsapp, hours, latitude, longitude, zone_id, is_active, created_by, printing_fee, assistance_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [name, type, commune, quartier, address, phone, whatsapp || null, hours, latitude || null, longitude || null, zone_id || null, is_active, req.user!.id, printing_fee || 100, assistance_fee || 500]
    );

    // Log admin activity
    await logAdminActivity(
      req.user!.id,
      'create_relay_point',
      'relay_point',
      result.rows[0].id,
      { name, commune, type },
      req
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create relay point error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update relay point (admin or relay_partner owning this relay)
router.patch('/:id', authenticate, requireRole('admin', 'relay_partner'), async (req: AuthRequest, res) => {
  try {
    const { name, type, commune, quartier, address, phone, whatsapp, hours, latitude, longitude, zone_id, is_active, printing_fee, assistance_fee, email, has_computer, has_printer, has_internet } = req.body;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin) {
      // Check ownership: user must have this relay as their relay_point_id
      const ownership = await pool.query('SELECT relay_point_id FROM users WHERE id = $1', [req.user!.id]);
      const myRelayId = ownership.rows[0]?.relay_point_id;
      const targetId = String(req.params.id || '').trim();
      const ownId = myRelayId ? String(myRelayId).trim() : '';
      if (!ownId || ownId.toLowerCase() !== targetId.toLowerCase()) {
        return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre point relais' });
      }
    }
    // Basic validation
    const validateNumber = (v: any) => v === null || v === undefined || typeof v === 'number' || !isNaN(parseFloat(v));
    if (printing_fee !== undefined && (!validateNumber(printing_fee) || Number(printing_fee) < 0)) {
      return res.status(400).json({ error: 'Invalid printing_fee' });
    }
    if (assistance_fee !== undefined && (!validateNumber(assistance_fee) || Number(assistance_fee) < 0)) {
      return res.status(400).json({ error: 'Invalid assistance_fee' });
    }
    if (latitude !== undefined && latitude !== null) {
      const lat = Number(latitude);
      if (!validateNumber(latitude) || lat < -90 || lat > 90) return res.status(400).json({ error: 'Invalid latitude' });
    }
    if (longitude !== undefined && longitude !== null) {
      const lon = Number(longitude);
      if (!validateNumber(longitude) || lon < -180 || lon > 180) return res.status(400).json({ error: 'Invalid longitude' });
    }
    // Validate email format if provided
    if (email !== undefined && email !== null && email !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Format d\'email invalide' });
      }
    }
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Allow relay_partner to modify these fields (not just admin)
    if (name) {
      updates.push(`name = $${++paramCount}`);
      values.push(name);
    }
    if (type) {
      updates.push(`type = $${++paramCount}`);
      values.push(type);
    }
    if (commune) {
      updates.push(`commune = $${++paramCount}`);
      values.push(commune);
    }
    if (quartier) {
      updates.push(`quartier = $${++paramCount}`);
      values.push(quartier);
    }
    if (address) {
      updates.push(`address = $${++paramCount}`);
      values.push(address);
    }
    if (phone) {
      updates.push(`phone = $${++paramCount}`);
      values.push(phone);
    }
    if (whatsapp !== undefined) {
      updates.push(`whatsapp = $${++paramCount}`);
      values.push(whatsapp);
    }
    if (email !== undefined) {
      updates.push(`email = $${++paramCount}`);
      values.push(email);
    }
    if (has_computer !== undefined) {
      updates.push(`has_computer = $${++paramCount}`);
      values.push(has_computer);
    }
    if (has_printer !== undefined) {
      updates.push(`has_printer = $${++paramCount}`);
      values.push(has_printer);
    }
    if (has_internet !== undefined) {
      updates.push(`has_internet = $${++paramCount}`);
      values.push(has_internet);
    }
    if (hours) {
      updates.push(`hours = $${++paramCount}`);
      values.push(hours);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${++paramCount}`);
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${++paramCount}`);
      values.push(longitude);
    }
    if (is_active !== undefined && isAdmin) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(is_active);
    }
    if (printing_fee !== undefined) {
      updates.push(`printing_fee = $${++paramCount}`);
      values.push(printing_fee);
    }
    if (assistance_fee !== undefined) {
      updates.push(`assistance_fee = $${++paramCount}`);
      values.push(assistance_fee);
    }
    if (zone_id !== undefined && isAdmin) {
      // Only admin can change zone assignment
      updates.push(`zone_id = $${++paramCount}`);
      values.push(zone_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_by and updated_at
    updates.push(`updated_by = $${++paramCount}`);
    values.push(req.user!.id);
    updates.push(`updated_at = NOW()`);
    
    // Add WHERE clause parameter
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE relay_points SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relay point not found' });
    }

    // Log activity (non-critical)
    try {
      await logAdminActivity(
        req.user!.id,
        'update_relay_point',
        'relay_point',
        req.params.id,
        { fields: updates },
        req
      );
    } catch (e) {
      // ignore
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update relay point error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete relay point (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    // Get relay info before deletion for logging
    const relayToDelete = await pool.query('SELECT name, commune FROM relay_points WHERE id = $1', [req.params.id]);
    
    await pool.query('DELETE FROM relay_points WHERE id = $1', [req.params.id]);

    // Log admin activity
    if (relayToDelete.rows[0]) {
      await logAdminActivity(
        req.user!.id,
        'delete_relay_point',
        'relay_point',
        req.params.id,
        { deleted_relay_name: relayToDelete.rows[0].name, deleted_relay_commune: relayToDelete.rows[0].commune },
        req
      );
    }

    res.json({ message: 'Relay point deleted successfully' });
  } catch (error: any) {
    console.error('Delete relay point error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

