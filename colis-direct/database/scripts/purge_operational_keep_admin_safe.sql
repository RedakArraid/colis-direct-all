-- =============================================================================
-- Purge sûre des données opérationnelles — garde uniquement admin@colisdirect.ci
-- Conserve sans les vider :
--   migrations, pricing_grids, pricing_settings, additional_pricing_options,
--   delivery_zones, admin_settings
--
-- Note : la table `chatbot_messages` peut être absente sur certaines bases.
-- Dans ce cas commenter la ligne correspondante ou ignorer l’erreur.
-- =============================================================================

BEGIN;

DELETE FROM api_webhook_deliveries;
DELETE FROM api_usage_logs;
DELETE FROM api_webhooks;
DELETE FROM api_keys;

DELETE FROM shipment_handoffs;
DELETE FROM shipment_status_history;
DELETE FROM shipment_tracking;
DELETE FROM shipments;

DELETE FROM relay_cash_payments;
DELETE FROM mobile_money_payments;
DELETE FROM automated_payments;

DELETE FROM transporter_delivery_zones;
DELETE FROM transporter_assignments;
DELETE FROM transporters;

DELETE FROM tracking_events;

DELETE FROM relay_point_metrics;
DELETE FROM relay_point_daily_metrics;
DELETE FROM relay_partners;
DELETE FROM relay_point_applications;

DELETE FROM support_ticket_events;
DELETE FROM support_reminders;
DELETE FROM support_notes;
DELETE FROM support_messages;
DELETE FROM customer_messages;
DELETE FROM support_tickets;

DELETE FROM user_shipping_addresses;
DELETE FROM sender_addresses;
DELETE FROM recipient_addresses;

DELETE FROM pro_address_book;
DELETE FROM pro_business_profiles;

DELETE FROM job_applications;
DELETE FROM job_postings;

DO $$
BEGIN
  DELETE FROM chatbot_messages;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DELETE FROM relay_points;

DELETE FROM users
WHERE lower(trim(email)) IS DISTINCT FROM lower(trim('admin@colisdirect.ci'));

UPDATE users
SET relay_point_id = NULL,
    updated_at = now()
WHERE lower(trim(email)) = lower(trim('admin@colisdirect.ci'));

COMMIT;
