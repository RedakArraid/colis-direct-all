-- OBSOLÈTE — ne pas utiliser.
-- L’ancienne version utilisait TRUNCATE … CASCADE par boucle et vidait par erreur
-- `users`, `delivery_zones`, etc.
--
-- Utiliser à la place :
--   database/scripts/purge_operational_keep_admin_safe.sql
--
-- En cas de désastre (users vides) :
--   database/scripts/restore_admin_and_delivery_zones.sql

SELECT 'Utilisez purge_operational_keep_admin_safe.sql'::text AS message;
