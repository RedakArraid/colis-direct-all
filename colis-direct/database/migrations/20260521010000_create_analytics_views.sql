-- Create analytics views: daily_statistics, monthly_reports, relay_point_performance
-- These replace the missing tables queried by GET /api/analytics/daily and /monthly
-- DROP before CREATE to handle column renames on fresh DBs (init schema may have
-- different column names than what we want here).

DROP VIEW IF EXISTS shipment_statistics CASCADE;
DROP VIEW IF EXISTS relay_point_performance CASCADE;
DROP VIEW IF EXISTS monthly_reports CASCADE;
DROP VIEW IF EXISTS daily_statistics CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. daily_statistics VIEW
--    Aggregates per day: shipments created, delivered, revenue
-- ─────────────────────────────────────────────────────────────
CREATE VIEW daily_statistics AS
SELECT
  DATE(s.created_at)                                            AS date,
  COUNT(*)                                                      AS total_shipments,
  COUNT(*) FILTER (WHERE s.payment_status = 'paid')            AS paid_shipments,
  COUNT(*) FILTER (WHERE s.current_status IN (
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'
  ))                                                            AS delivered_shipments,
  COUNT(*) FILTER (WHERE s.current_status = 'CANCELLED')       AS cancelled_shipments,
  COALESCE(SUM(s.price) FILTER (WHERE s.payment_status = 'paid'), 0)  AS total_revenue,
  COUNT(*) FILTER (WHERE s.home_delivery = TRUE)                AS home_delivery_count,
  COUNT(*) FILTER (WHERE s.home_delivery = FALSE)               AS relay_delivery_count,
  COUNT(*) FILTER (WHERE s.pickup_method = 'home_pickup')       AS home_pickup_count,
  COUNT(*) FILTER (WHERE s.pickup_method = 'relay_deposit')     AS relay_deposit_count
FROM shipments s
GROUP BY DATE(s.created_at);

-- ─────────────────────────────────────────────────────────────
-- 2. monthly_reports VIEW
-- ─────────────────────────────────────────────────────────────
CREATE VIEW monthly_reports AS
SELECT
  EXTRACT(YEAR  FROM s.created_at)::int                         AS year,
  EXTRACT(MONTH FROM s.created_at)::int                         AS month,
  TO_CHAR(s.created_at, 'YYYY-MM')                              AS period,
  COUNT(*)                                                      AS total_shipments,
  COUNT(*) FILTER (WHERE s.payment_status = 'paid')            AS paid_shipments,
  COUNT(*) FILTER (WHERE s.current_status IN (
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'
  ))                                                            AS delivered_shipments,
  COUNT(*) FILTER (WHERE s.current_status = 'CANCELLED')       AS cancelled_shipments,
  COALESCE(SUM(s.price) FILTER (WHERE s.payment_status = 'paid'), 0)  AS total_revenue,
  ROUND(
    COUNT(*) FILTER (WHERE s.current_status IN (
      'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'
    ))::numeric * 100.0
    / NULLIF(COUNT(*), 0), 2
  )                                                             AS success_rate_pct
FROM shipments s
GROUP BY
  EXTRACT(YEAR  FROM s.created_at),
  EXTRACT(MONTH FROM s.created_at),
  TO_CHAR(s.created_at, 'YYYY-MM');

-- ─────────────────────────────────────────────────────────────
-- 3. relay_point_performance VIEW
-- ─────────────────────────────────────────────────────────────
CREATE VIEW relay_point_performance AS
SELECT
  rp.id                                                         AS relay_id,
  rp.name,
  rp.commune,
  rp.zone_id,
  COUNT(s.id)                                                   AS total_shipments,
  COUNT(s.id) FILTER (WHERE s.current_status IN (
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'
  ))                                                            AS delivered_shipments,
  COALESCE(SUM(s.price) FILTER (WHERE s.payment_status = 'paid'), 0) AS total_revenue,
  COUNT(s.id) FILTER (WHERE s.origin_relay_id = rp.id)         AS sent_from_relay,
  COUNT(s.id) FILTER (WHERE s.destination_relay_id = rp.id)    AS delivered_to_relay
FROM relay_points rp
LEFT JOIN shipments s
  ON s.origin_relay_id = rp.id OR s.destination_relay_id = rp.id
GROUP BY rp.id, rp.name, rp.commune, rp.zone_id;

-- ─────────────────────────────────────────────────────────────
-- 4. shipment_statistics VIEW (used by /api/analytics/shipment-stats)
-- ─────────────────────────────────────────────────────────────
CREATE VIEW shipment_statistics AS
SELECT
  DATE(created_at)          AS date,
  COUNT(*)                  AS total,
  COUNT(*) FILTER (WHERE current_status IN (
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER'
  ))                        AS delivered,
  COUNT(*) FILTER (WHERE current_status = 'CANCELLED') AS cancelled,
  COALESCE(SUM(price) FILTER (WHERE payment_status = 'paid'), 0) AS revenue
FROM shipments
GROUP BY DATE(created_at);
