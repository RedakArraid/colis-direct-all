-- Position GPS temps réel des livreurs (suivi style Uber côté expéditeur)
-- Le livreur pousse sa position pendant qu'il a une course active ; l'expéditeur
-- d'un colis home_pickup la voit sur une carte après acceptation de la course.

ALTER TABLE transporters
  ADD COLUMN IF NOT EXISTS current_latitude   double precision,
  ADD COLUMN IF NOT EXISTS current_longitude  double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- Coordonnées du point de ramassage à domicile (affichées sur la carte de suivi).
-- Nullable : renseignées à la création du colis si le client partage sa position.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS sender_latitude  double precision,
  ADD COLUMN IF NOT EXISTS sender_longitude double precision;
