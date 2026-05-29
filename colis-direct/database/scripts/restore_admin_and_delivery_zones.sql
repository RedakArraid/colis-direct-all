-- Restaure le compte admin par défaut et les zones livraison (seed migration 20260430220000).
-- Mot de passe admin : admin123 (à changer après connexion)

BEGIN;

INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'admin@colisdirect.ci',
  '$2a$10$3lUFA3ejW4NSIZck0kes7O/mK6E2jE6FKzSvpl/RHf.Qb3.t8ORy6',
  'Admin',
  'COLISDIRECT',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  relay_point_id = NULL,
  updated_at = now();

-- Seed delivery_zones (copie logique de 20260430220000_seed_delivery_zones.sql)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM delivery_zones LIMIT 1) THEN
    INSERT INTO delivery_zones (name, description, communes, min_latitude, max_latitude, min_longitude, max_longitude, is_active)
    VALUES
      (
        'Abidjan – Plateau / Cocody / Marcory',
        'Centre commercial et quartiers résidentiels Est d''Abidjan',
        ARRAY['Plateau','Cocody','Marcory','Treichville','Port-Bouët','Bietry','Riviera'],
        5.2800, 5.3800, -3.9800, -3.9200,
        true
      ),
      (
        'Abidjan – Yopougon / Attécoubé',
        'Communes populaires Ouest d''Abidjan',
        ARRAY['Yopougon','Attécoubé','Songon'],
        5.3000, 5.4200, -4.1200, -3.9800,
        true
      ),
      (
        'Abidjan – Abobo / Anyama',
        'Communes Nord d''Abidjan',
        ARRAY['Abobo','Anyama','Bingerville'],
        5.3700, 5.5000, -4.0500, -3.8500,
        true
      ),
      (
        'Abidjan – Koumassi / Vridi',
        'Communes industrielles Sud d''Abidjan',
        ARRAY['Koumassi','Vridi','Grand-Bassam'],
        5.2200, 5.3200, -3.9500, -3.7800,
        true
      ),
      (
        'Bouaké',
        'Deuxième ville de Côte d''Ivoire – centre du pays',
        ARRAY['Bouaké','Katiola','Béoumi'],
        7.5000, 7.8000, -5.1500, -4.9000,
        true
      ),
      (
        'San-Pédro',
        'Port et ville du Sud-Ouest',
        ARRAY['San-Pédro','Sassandra','Tabou'],
        4.5000, 5.0000, -7.0000, -6.4000,
        true
      ),
      (
        'Yamoussoukro',
        'Capitale politique de Côte d''Ivoire',
        ARRAY['Yamoussoukro','Toumodi','Tiébissou'],
        6.6000, 7.0000, -5.3000, -5.1000,
        true
      ),
      (
        'Korhogo',
        'Capitale du Nord de la Côte d''Ivoire',
        ARRAY['Korhogo','Sinématiali','Boundiali'],
        9.3000, 9.7000, -5.7000, -5.4000,
        true
      ),
      (
        'Man',
        'Ville de l''Ouest montagneux',
        ARRAY['Man','Danané','Bangolo'],
        7.2000, 7.6000, -7.7000, -7.4000,
        true
      ),
      (
        'Daloa',
        'Capitale du cacao – Centre-Ouest',
        ARRAY['Daloa','Issia','Vavoua'],
        6.7000, 7.0000, -6.6000, -6.3000,
        true
      );
  END IF;
END $$;

COMMIT;

SELECT count(*)::text AS users_count FROM users WHERE email = 'admin@colisdirect.ci';
SELECT count(*)::text AS delivery_zones_count FROM delivery_zones;
