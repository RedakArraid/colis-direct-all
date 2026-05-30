-- ============================================================
-- Migration: map_adjame_zone
-- Adjamé (commune centrale d'Abidjan) n'était rattachée à aucune
-- delivery_zone → le calcul de distance tombait à 0 km (tarif minimal).
-- On la rattache à la zone centrale Plateau/Cocody/Marcory.
-- (Le calcul /calculate gère désormais aussi le cas générique
--  "commune non mappée" en appliquant le palier le plus élevé.)
-- ============================================================

UPDATE delivery_zones
   SET communes = array_append(communes, 'Adjamé'),
       updated_at = NOW()
 WHERE name = 'Abidjan – Plateau / Cocody / Marcory'
   AND NOT ('Adjamé' = ANY(communes));
