-- Fix assign_shipment_to_transporter function and related schema issues:
-- 1. Create get_relay_distance() — was called but never defined
-- 2. Fix transporter_assignments.assignment_status CHECK — add missing 'picked_up'
-- 3. Rewrite assign_shipment_to_transporter():
--    - Handle home_pickup (NULL origin_relay_id) — was raising EXCEPTION
--    - Remove invalid `status = 'assigned'` update on legacy shipments.status column
--    - Count query now consistent with fixed CHECK constraint

-- ─── 1. get_relay_distance ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_relay_distance(
  p_relay_a uuid,
  p_relay_b uuid
) RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_lat_a numeric;
  v_lon_a numeric;
  v_lat_b numeric;
  v_lon_b numeric;
  v_dlat  numeric;
  v_dlon  numeric;
  v_a     numeric;
BEGIN
  SELECT latitude, longitude INTO v_lat_a, v_lon_a
  FROM relay_points WHERE id = p_relay_a;

  SELECT latitude, longitude INTO v_lat_b, v_lon_b
  FROM relay_points WHERE id = p_relay_b;

  IF v_lat_a IS NULL OR v_lat_b IS NULL THEN
    RETURN 50;
  END IF;

  -- Haversine formula, returns distance in km
  v_dlat := radians(v_lat_b - v_lat_a);
  v_dlon := radians(v_lon_b - v_lon_a);
  v_a := sin(v_dlat / 2) ^ 2
       + cos(radians(v_lat_a)) * cos(radians(v_lat_b)) * sin(v_dlon / 2) ^ 2;
  RETURN 6371 * 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
END;
$$;


-- ─── 2. transporter_assignments CHECK — add 'picked_up' ─────────────────────

ALTER TABLE public.transporter_assignments
  DROP CONSTRAINT IF EXISTS transporter_assignments_assignment_status_check;

ALTER TABLE public.transporter_assignments
  ADD CONSTRAINT transporter_assignments_assignment_status_check
    CHECK (assignment_status = ANY (ARRAY[
      'pending'::text, 'picked_up'::text, 'in_transit'::text, 'delivered'::text
    ]));


-- ─── 3. Rewrite assign_shipment_to_transporter ───────────────────────────────

CREATE OR REPLACE FUNCTION public.assign_shipment_to_transporter(p_shipment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_origin_relay_id      uuid;
  v_destination_relay_id uuid;
  v_home_delivery        boolean;
  v_pickup_method        text;
  v_dest_commune         text;
  v_dest_address         text;
  v_sender_commune       text;
  v_relay_zone_id        uuid;
  v_best_transporter_id  uuid;
  v_min_score            double precision := 999999;
  v_transporter          record;
  v_distance_km          double precision;
  v_current_load         integer;
  v_score                double precision;
BEGIN
  SELECT origin_relay_id, destination_relay_id, home_delivery, pickup_method,
         recipient_commune, recipient_address, sender_commune
  INTO   v_origin_relay_id, v_destination_relay_id, v_home_delivery, v_pickup_method,
         v_dest_commune, v_dest_address, v_sender_commune
  FROM   shipments
  WHERE  id = p_shipment_id;

  -- Determine delivery zone for scoring
  IF v_home_delivery THEN
    SELECT dz.id INTO v_relay_zone_id
    FROM   delivery_zones dz
    WHERE  v_dest_commune = ANY(dz.communes)
    LIMIT 1;
  ELSIF v_pickup_method = 'home_pickup' THEN
    -- Home pickup: origin relay is NULL — match zone by sender commune
    SELECT dz.id INTO v_relay_zone_id
    FROM   delivery_zones dz
    WHERE  v_sender_commune = ANY(dz.communes)
    LIMIT 1;
  ELSE
    SELECT zone_id INTO v_relay_zone_id
    FROM   relay_points
    WHERE  id = COALESCE(v_destination_relay_id, v_origin_relay_id);
  END IF;

  FOR v_transporter IN
    SELECT t.id, t.status, t.current_packages,
           u.relay_point_id AS transporter_location_id,
           CASE WHEN EXISTS (
             SELECT 1 FROM transporter_delivery_zones tdz
             WHERE  tdz.transporter_id = t.id
               AND  tdz.zone_id = v_relay_zone_id
           ) THEN true ELSE false END AS is_in_zone
    FROM   transporters t
    JOIN   users u ON t.user_id = u.id
    LEFT JOIN relay_points rp ON u.relay_point_id = rp.id
    WHERE  t.status IN ('available', 'busy')
      AND  t.current_packages < 10
  LOOP
    IF v_transporter.transporter_location_id IS NOT NULL
       AND v_origin_relay_id IS NOT NULL THEN
      v_distance_km := get_relay_distance(
        v_transporter.transporter_location_id, v_origin_relay_id
      );
    ELSE
      v_distance_km := 50;
    END IF;

    SELECT COUNT(*) INTO v_current_load
    FROM   transporter_assignments
    WHERE  transporter_id    = v_transporter.id
      AND  assignment_status IN ('pending', 'picked_up');

    v_score := COALESCE(v_distance_km, 50) * 0.5 + (v_current_load * 10) * 0.3;

    IF v_transporter.status = 'available' THEN
      v_score := v_score * 0.9;
    END IF;

    IF v_relay_zone_id IS NOT NULL AND v_transporter.is_in_zone THEN
      v_score := v_score * 0.5;
    END IF;

    IF v_score < v_min_score THEN
      v_min_score              := v_score;
      v_best_transporter_id   := v_transporter.id;
    END IF;
  END LOOP;

  IF v_best_transporter_id IS NULL THEN
    RAISE EXCEPTION 'No available transporter found';
  END IF;

  INSERT INTO transporter_assignments (
    transporter_id, shipment_id, relay_point_id,
    assignment_status, expected_pickup_at
  )
  VALUES (
    v_best_transporter_id, p_shipment_id, v_origin_relay_id,
    'pending', now() + interval '2 hours'
  )
  ON CONFLICT (transporter_id, shipment_id) DO UPDATE
    SET updated_at = now();

  -- Set transporter on shipment; do NOT touch the legacy shipments.status text column
  UPDATE shipments
  SET    transporter_id = v_best_transporter_id
  WHERE  id = p_shipment_id;

  UPDATE transporters
  SET    current_packages = current_packages + 1
  WHERE  id = v_best_transporter_id;

  RETURN v_best_transporter_id;
END;
$$;
