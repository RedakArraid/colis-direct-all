import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Get dashboard statistics (admin only)
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
    const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();

    // Daily shipments (using timezone-aware date comparison)
    const dailyShipments = await pool.query(
      `SELECT COUNT(*) as count FROM shipments WHERE DATE(created_at AT TIME ZONE 'UTC') = DATE($1::timestamp AT TIME ZONE 'UTC')`,
      [today]
    );

    // In transit (inclut pris en charge par transporteur pas encore "IN_TRANSIT" strict)
    const inTransit = await pool.query(
      `SELECT COUNT(*) as count FROM shipments WHERE current_status IN ('IN_TRANSIT', 'CARRIER_COLLECTED')`
    );

    // Livraisons terminées (tous canaux)
    const deliveredToday = await pool.query(
      `SELECT COUNT(*) as count FROM shipments 
       WHERE current_status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER') 
       AND DATE(updated_at) = $1`,
      [today]
    );

    // Total delivered
    const totalDelivered = await pool.query(
      `SELECT COUNT(*) as count FROM shipments 
       WHERE current_status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER')`
    );

    // Total revenue
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(price), 0) as total FROM shipments WHERE payment_status = 'paid' AND created_at >= $1`,
      [startOfMonth]
    );

    // Total users
    const totalUsers = await pool.query(`SELECT COUNT(*) as count FROM users`);

    // Active relay points
    const activeRelays = await pool.query(
      `SELECT COUNT(*) as count FROM relay_points WHERE is_active = true`
    );

    // Shipments by commune
    const byCommune = await pool.query(
      `SELECT sender_commune, COUNT(*) as count
       FROM shipments
       WHERE created_at >= $1
       GROUP BY sender_commune
       ORDER BY count DESC
       LIMIT 10`,
      [startOfMonth]
    );

    // Shipments by status
    const byStatus = await pool.query(
      `SELECT current_status, COUNT(*) as count
       FROM shipments
       GROUP BY current_status
       ORDER BY count DESC`
    );

    // Daily shipments for last 30 days (for charts)
    const dailyData = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as shipments,
        COALESCE(SUM(price), 0) as revenue
       FROM shipments
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // Recent activity (last 20 shipments)
    const recentActivity = await pool.query(
      `SELECT 
        s.id,
        s.tracking_number,
        s.current_status,
        s.created_at,
        s.updated_at,
        (s.sender_first_name || ' ' || s.sender_last_name) as sender_name,
        (s.recipient_first_name || ' ' || s.recipient_last_name) as recipient_name,
        s.price,
        (SELECT status FROM shipment_tracking WHERE shipment_id = s.id ORDER BY created_at DESC LIMIT 1) as last_tracking_status,
        (SELECT created_at FROM shipment_tracking WHERE shipment_id = s.id ORDER BY created_at DESC LIMIT 1) as last_tracking_date,
        (SELECT u.first_name || ' ' || u.last_name FROM shipment_tracking st2 
         JOIN users u ON st2.updated_by = u.id 
         WHERE st2.shipment_id = s.id ORDER BY st2.created_at DESC LIMIT 1) as updated_by_name
       FROM shipments s
       ORDER BY COALESCE(
         (SELECT created_at FROM shipment_tracking WHERE shipment_id = s.id ORDER BY created_at DESC LIMIT 1),
         s.updated_at,
         s.created_at
       ) DESC
       LIMIT 20`
    );

    // Weekly comparison
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const currentWeekShipments = await pool.query(
      `SELECT COUNT(*) as count FROM shipments WHERE created_at >= $1`,
      [currentWeekStart.toISOString()]
    );
    
    const lastWeekShipments = await pool.query(
      `SELECT COUNT(*) as count FROM shipments WHERE created_at >= $1 AND created_at < $2`,
      [lastWeekStart.toISOString(), currentWeekStart.toISOString()]
    );

    const weekGrowth = lastWeekShipments.rows[0].count > 0
      ? ((parseInt(currentWeekShipments.rows[0].count) - parseInt(lastWeekShipments.rows[0].count)) / parseInt(lastWeekShipments.rows[0].count) * 100)
      : 0;

    // Delivery mode split (relay vs home delivery) for last 30 days
    const deliveryModes = await pool.query(
      `SELECT 
        SUM(CASE WHEN home_delivery THEN 1 ELSE 0 END) AS home_delivery,
        SUM(CASE WHEN NOT home_delivery THEN 1 ELSE 0 END) AS relay_delivery
       FROM shipments
       WHERE created_at >= $1`,
      [thirtyDaysAgo]
    );

    // Top relay points (last 30 days)
    const topRelayPoints = await pool.query(
      `SELECT 
         rp.id,
         rp.name,
         rp.commune,
         COUNT(*) AS count
       FROM shipments s
       JOIN relay_points rp ON rp.id = s.destination_relay_id
       WHERE s.home_delivery = false
         AND s.destination_relay_id IS NOT NULL
         AND s.created_at >= $1
       GROUP BY rp.id, rp.name, rp.commune
       ORDER BY count DESC
       LIMIT 5`,
      [thirtyDaysAgo]
    );

    // Average delivery time and success rate (last 30 days)
    const avgDeliveryTime = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (delivered.delivered_at - s.created_at))) AS avg_seconds
       FROM shipments s
       JOIN LATERAL (
         SELECT st.created_at AS delivered_at
         FROM shipment_tracking st
         WHERE st.shipment_id = s.id 
           AND st.status IN ('DELIVERED','DELIVERED_TO_CUSTOMER','PICKED_UP_BY_CUSTOMER')
         ORDER BY st.created_at DESC
         LIMIT 1
       ) delivered ON true
       WHERE delivered.delivered_at IS NOT NULL
         AND s.created_at >= $1`,
      [thirtyDaysAgo]
    );

    const deliveredLast30 = await pool.query(
      `SELECT COUNT(*) as count
       FROM shipments
       WHERE created_at >= $1
         AND current_status IN ('DELIVERED','DELIVERED_TO_CUSTOMER','PICKED_UP_BY_CUSTOMER')`,
      [thirtyDaysAgo]
    );

    const totalLast30 = await pool.query(
      `SELECT COUNT(*) as count
       FROM shipments
       WHERE created_at >= $1`,
      [thirtyDaysAgo]
    );

    const incidentLast30 = await pool.query(
      `SELECT COUNT(*) as count
       FROM shipments
       WHERE created_at >= $1
         AND current_status IN ('RETURN_TO_SENDER','CANCELLED')`,
      [thirtyDaysAgo]
    );

    const stuckShipmentsCount = await pool.query(
      `SELECT COUNT(*) as count
       FROM shipments
       WHERE current_status NOT IN ('DELIVERED','DELIVERED_TO_CUSTOMER','PICKED_UP_BY_CUSTOMER','CANCELLED','RETURN_TO_SENDER')
         AND updated_at < NOW() - INTERVAL '48 hours'`
    );

    const stuckShipmentsDetails = await pool.query(
      `SELECT 
         id,
         tracking_number,
         current_status,
         updated_at,
         EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS age_hours
       FROM shipments
       WHERE current_status NOT IN ('DELIVERED','DELIVERED_TO_CUSTOMER','PICKED_UP_BY_CUSTOMER','CANCELLED','RETURN_TO_SENDER')
         AND updated_at < NOW() - INTERVAL '48 hours'
       ORDER BY updated_at ASC
       LIMIT 10`
    );

    // Support tickets summary
    const supportSummary = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM support_tickets
       GROUP BY status`
    );

    // Pending relay applications
    const pendingRelayApplications = await pool.query(
      `SELECT id, business_name, commune, quartier, created_at
       FROM relay_point_applications
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 10`
    );

    const pendingRelayApplicationsCount = await pool.query(
      `SELECT COUNT(*) as count
       FROM relay_point_applications
       WHERE status = 'pending'`
    );

    // Delivery zones summary
    const zoneSummary = await pool.query(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) AS inactive
       FROM delivery_zones`
    );

    const topZones = await pool.query(
      `SELECT 
         dz.id,
         dz.name,
         COUNT(s.id) AS count
       FROM delivery_zones dz
       LEFT JOIN shipments s
         ON s.recipient_commune = ANY(dz.communes)
         AND s.created_at >= $1
       GROUP BY dz.id, dz.name
       ORDER BY count DESC
       LIMIT 10`,
      [thirtyDaysAgo]
    );

    res.json({
      dailyShipments: parseInt(dailyShipments.rows[0].count),
      inTransit: parseInt(inTransit.rows[0].count),
      deliveredToday: parseInt(deliveredToday.rows[0].count),
      totalDelivered: parseInt(totalDelivered.rows[0].count),
      monthlyRevenue: parseFloat(revenue.rows[0].total),
      totalUsers: parseInt(totalUsers.rows[0].count),
      activeRelays: parseInt(activeRelays.rows[0].count),
      byCommune: byCommune.rows,
      byStatus: byStatus.rows,
      dailyData: dailyData.rows,
      recentActivity: recentActivity.rows,
      weekGrowth: Math.round(weekGrowth * 10) / 10,
      deliveryModes: {
        relay: parseInt(deliveryModes.rows[0].relay_delivery || 0),
        home: parseInt(deliveryModes.rows[0].home_delivery || 0),
      },
      topRelayPoints: topRelayPoints.rows,
      performance: {
        avgDeliveryHours: avgDeliveryTime.rows[0].avg_seconds
          ? parseFloat(avgDeliveryTime.rows[0].avg_seconds) / 3600
          : null,
        successRate:
          parseInt(totalLast30.rows[0].count) > 0
            ? (parseInt(deliveredLast30.rows[0].count) / parseInt(totalLast30.rows[0].count)) * 100
            : null,
        incidentCount: parseInt(incidentLast30.rows[0].count),
        stuckShipments: parseInt(stuckShipmentsCount.rows[0].count),
      },
      supportSummary: supportSummary.rows.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      pendingRelayApplications: pendingRelayApplications.rows,
      pendingRelayApplicationsCount: parseInt(pendingRelayApplicationsCount.rows[0].count),
      stuckShipmentsDetails: stuckShipmentsDetails.rows,
      topZones: topZones.rows,
      zoneSummary: zoneSummary.rows.length
        ? {
            total: parseInt(zoneSummary.rows[0].total || 0),
            active: parseInt(zoneSummary.rows[0].active || 0),
            inactive: parseInt(zoneSummary.rows[0].inactive || 0),
          }
        : { total: 0, active: 0, inactive: 0 },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

