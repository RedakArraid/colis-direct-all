-- ============================================================
-- Migration: distance_based_pricing
-- Remplace la logique intra/inter-commune par un vrai calcul
-- distance (km) × taille de colis, configurable par l'admin.
-- La distance est calculée via Haversine entre les centroides
-- des delivery_zones existantes.
-- ============================================================

CREATE TABLE IF NOT EXISTS delivery_price_tiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name     TEXT NOT NULL,
  distance_km_min NUMERIC(8,2) NOT NULL DEFAULT 0,
  distance_km_max NUMERIC(8,2),             -- NULL = illimité
  price_courrier  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_petit     NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_moyen     NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_grand     NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  display_order INT     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_price_tiers_active_dist
  ON delivery_price_tiers (distance_km_min, distance_km_max)
  WHERE is_active = true;

-- Tranches tarifaires par défaut (modifiables par l'admin)
INSERT INTO delivery_price_tiers
  (tier_name, distance_km_min, distance_km_max,
   price_courrier, price_petit, price_moyen, price_grand, display_order)
VALUES
  ('Intra-quartier (0–5 km)',      0,   5,    500,   800,  1500,  2500, 1),
  ('Intra-ville (5–20 km)',        5,  20,    800,  1200,  2000,  3500, 2),
  ('Grand-Abidjan (20–50 km)',    20,  50,   1200,  1800,  3000,  5000, 3),
  ('Régional (50–150 km)',        50, 150,   2000,  3000,  5000,  8000, 4),
  ('Inter-villes (> 150 km)',    150, NULL,  3000,  5000,  8000, 12000, 5)
ON CONFLICT DO NOTHING;
