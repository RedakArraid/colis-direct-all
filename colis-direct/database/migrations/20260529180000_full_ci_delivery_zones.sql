-- ============================================================
-- Migration: full_ci_delivery_zones
-- Couvre TOUTES les communes de Côte d'Ivoire (cf. src/utils/ciLocations.ts)
-- par des zones régionales, pour que le calcul de distance ne tombe plus
-- dans le fallback "inter-villes" pour les villes de l'intérieur.
--   • 1 zone par région administrative manquante, coordonnées du chef-lieu
--     (min=max → centroïde = la ville), communes de la région rattachées.
--   • Les 4 zones Abidjan + Yamoussoukro + 6 zones villes existantes sont
--     conservées ; on y ajoute seulement les communes de leur région absentes.
-- Idempotent : INSERT WHERE NOT EXISTS (name) + UPDATE gardés par témoin.
-- Aucune suppression → aucun impact sur les FK relais/transporteurs.
-- ============================================================

-- 1) Nouvelles zones régionales (chef-lieu = centroïde)
INSERT INTO delivery_zones (name, communes, min_latitude, max_latitude, min_longitude, max_longitude, is_active)
SELECT v.name, v.communes, v.lat, v.lat, v.lng, v.lng, true
FROM (VALUES
  ('Gbôklé (Sassandra)',            ARRAY['Fresco','Gueyo'],                                          4.9500::numeric, -6.0833::numeric),
  ('Nawa (Soubré)',                 ARRAY['Buyo','Grabo','Méagui','Soubré'],                          5.7833::numeric, -6.6000::numeric),
  ('Indénié-Djuablin (Abengourou)', ARRAY['Abengourou','Agnibilékrou','Bettié','Niablé','Zaranou'],   6.7297::numeric, -3.4964::numeric),
  ('Sud-Comoé (Aboisso)',           ARRAY['Aboisso','Adiaké','Ayamé','Maféré','Noé','Tiapoum'],       5.4667::numeric, -3.2000::numeric),
  ('Folon (Minignan)',              ARRAY['Kaniasso','Madinani','Minignan'],                          9.6167::numeric, -7.8500::numeric),
  ('Kabadougou (Odienné)',          ARRAY['Gbéléban','Odienné','Samatiguila','Séguélon'],             9.5000::numeric, -7.5667::numeric),
  ('Gôh (Gagnoa)',                  ARRAY['Gagnoa','Guiberoua','Ouragahio','Oumé'],                   6.1333::numeric, -5.9500::numeric),
  ('Lôh-Djiboua (Divo)',            ARRAY['Divo','Guitry','Hiré','Lakota'],                           5.8372::numeric, -5.3572::numeric),
  ('Bélier (Toumodi)',              ARRAY['Didiévi','Djékanou'],                                      6.5500::numeric, -5.0167::numeric),
  ('Iffou (Daoukro)',               ARRAY['Daoukro','M''batto','Prikro'],                             7.0583::numeric, -3.9628::numeric),
  ('Moronou (Bongouanou)',          ARRAY['Arrah','Bongouanou','Ouellé'],                             6.6500::numeric, -4.2000::numeric),
  ('N''Zi (Dimbokro)',              ARRAY['Bocanda','Dimbokro','Kouassi-Kouassikro','Langbonou'],     6.6500::numeric, -4.7000::numeric),
  ('Agnéby-Tiassa (Agboville)',     ARRAY['Agboville','Azaguié','Cechi','Rubino','Sikensi','Taabo','Tiassalé'], 5.9333::numeric, -4.2167::numeric),
  ('Grands Ponts (Dabou)',          ARRAY['Dabou','Grand-Lahou','Jacqueville','Lopou'],               5.3239::numeric, -4.3772::numeric),
  ('La Mé (Adzopé)',                ARRAY['Adzopé','Akoupé','Alépé','Angovia','Yakassé-Attobrou'],    6.1067::numeric, -3.8606::numeric),
  ('Cavally (Guiglo)',              ARRAY['Blolequin','Facobly','Guiglo','Taï'],                      6.5444::numeric, -7.4869::numeric),
  ('Guémon (Duékoué)',              ARRAY['Duékoué','Kouibly'],                                       6.7422::numeric, -7.3433::numeric),
  ('Bafing (Touba)',                ARRAY['Booko','Koonan','Ouaninou','Touba'],                       8.2833::numeric, -7.6833::numeric),
  ('Marahoué (Bouaflé)',            ARRAY['Bonon','Bouaflé','Zuenoula'],                              6.9908::numeric, -5.7444::numeric),
  ('Bagoué (Boundiali)',            ARRAY['Gbon','Kouto','Tienie','Tingrela'],                        9.5167::numeric, -6.4833::numeric),
  ('Tchologo (Ferkessédougou)',     ARRAY['Ferkessédougou','Kong','Niellé','Ouangolodougou'],         9.5928::numeric, -5.1947::numeric),
  ('Hambol (Katiola)',              ARRAY['Dabakala','Niakara','Niakaramadougou'],                    8.1333::numeric, -5.1000::numeric),
  ('Béré (Mankono)',                ARRAY['Dianra','Kounahiri','Mankono'],                            8.0586::numeric, -6.1908::numeric),
  ('Worodougou (Séguéla)',          ARRAY['Morondo','Séguéla','Worofla'],                             7.9611::numeric, -6.6731::numeric),
  ('Bounkani (Bouna)',              ARRAY['Bouna','Doropo','Nassian','Téhini'],                       9.2667::numeric, -2.9833::numeric),
  ('Gontougo (Bondoukou)',          ARRAY['Bondoukou','Koun-Fao','Sandégué','Tanda'],                 8.0403::numeric, -2.8000::numeric)
) AS v(name, communes, lat, lng)
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones dz WHERE dz.name = v.name);

-- 2) Complément des zones villes existantes (communes de leur région encore absentes)
UPDATE delivery_zones SET communes = communes || ARRAY['Gabiadji','Grand-Béréby','Monogaga']
 WHERE name = 'San-Pédro' AND NOT (communes @> ARRAY['Gabiadji']);

UPDATE delivery_zones SET communes = communes || ARRAY['Biankouma','Sipilou','Toulépleu','Zouan-Hounien']
 WHERE name = 'Man' AND NOT (communes @> ARRAY['Biankouma']);

UPDATE delivery_zones SET communes = communes || ARRAY['Zoukougbeu']
 WHERE name = 'Daloa' AND NOT (communes @> ARRAY['Zoukougbeu']);

UPDATE delivery_zones SET communes = communes || ARRAY['Dikodougou','Kombolokoura','M''bengué']
 WHERE name = 'Korhogo' AND NOT (communes @> ARRAY['Dikodougou']);

UPDATE delivery_zones SET communes = communes || ARRAY['Botro','Brobo','Sakassou']
 WHERE name = 'Bouaké' AND NOT (communes @> ARRAY['Botro']);
