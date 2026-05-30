-- ============================================================
-- Migration: unified_distance_weight_pricing
-- Tarification unifiée distance × taille + supplément au poids.
--   • Réécrit la grille delivery_price_tiers (paliers de distance affinés,
--     prix alignés sur le marché ivoirien Yango/Wigo, un cran agressif).
--   • Ajoute les paramètres de tarification au poids (poids inclus par taille
--     + supplément FCFA/kg), jusqu'ici ignorés malgré le champ weight saisi.
-- Les remises par mode (relais/domicile) restent dans additional_pricing_options.
-- ============================================================

-- Réécriture de la grille par défaut (les tier_name par défaut sont remplacés).
-- NB: écrase d'éventuels ajustements admin sur ces lignes par défaut.
DELETE FROM delivery_price_tiers
 WHERE tier_name IN (
   'Intra-quartier (0–5 km)','Intra-ville (5–20 km)','Grand-Abidjan (20–50 km)',
   'Régional (50–150 km)','Inter-villes (> 150 km)'
 );

INSERT INTO delivery_price_tiers
  (tier_name, distance_km_min, distance_km_max,
   price_courrier, price_petit, price_moyen, price_grand, display_order)
VALUES
  ('Intra-quartier (0–5 km)',    0,    5,   500,  800, 1400, 2300, 1),
  ('Intra-ville (5–15 km)',      5,   15,   700, 1100, 1900, 3200, 2),
  ('Grand-Abidjan (15–35 km)',  15,   35,  1100, 1700, 2800, 4500, 3),
  ('Régional (35–100 km)',      35,  100,  1800, 2800, 4500, 7000, 4),
  ('Inter-villes (> 100 km)',  100, NULL,  3000, 4500, 7000, 11000, 5)
ON CONFLICT DO NOTHING;

-- Paramètres de tarification au poids (lus par GET /pricing-grids/calculate).
INSERT INTO additional_pricing_options
  (option_key, option_name, option_description, price_type, price_value, is_active, display_order)
VALUES
  ('weight_included_courrier', 'Poids inclus — Courrier',   'Poids (kg) inclus dans le tarif courrier avant supplément.',      'fixed',  1, true, 30),
  ('weight_included_petit',    'Poids inclus — Petit colis', 'Poids (kg) inclus dans le tarif petit colis avant supplément.',   'fixed',  5, true, 31),
  ('weight_included_moyen',    'Poids inclus — Colis moyen', 'Poids (kg) inclus dans le tarif colis moyen avant supplément.',   'fixed', 15, true, 32),
  ('weight_included_grand',    'Poids inclus — Grand colis', 'Poids (kg) inclus dans le tarif grand colis avant supplément.',   'fixed', 30, true, 33),
  ('weight_surcharge_per_kg',  'Supplément au poids (FCFA/kg)', 'Montant FCFA ajouté par kg au-delà du poids inclus de la taille.', 'fixed', 150, true, 34)
ON CONFLICT (option_key) DO NOTHING;
