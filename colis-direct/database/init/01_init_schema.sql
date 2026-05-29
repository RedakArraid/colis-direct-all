--
-- PostgreSQL database dump
--

\restrict zAXJtNtmr5ygaxPplS50wDFoO78bpabkcWn6DWU1XtYzbogCzBmm46a4OsrnFZs

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'on_hold'
);


--
-- Name: mobile_money_payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mobile_money_payment_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: relay_cash_payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.relay_cash_payment_status AS ENUM (
    'pending',
    'collected'
);


--
-- Name: shipment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shipment_status AS ENUM (
    'READY_FOR_DROP_OFF',
    'PICKUP_PENDING',
    'RELAY_ORIGIN_RECEIVED',
    'CARRIER_COLLECTED',
    'IN_TRANSIT',
    'RELAY_FINAL_RECEIVED',
    'AVAILABLE_FOR_PICKUP',
    'PICKED_UP_BY_CUSTOMER',
    'RETURN_TO_SENDER',
    'DELIVERED',
    'CANCELLED',
    'DELIVERED_TO_CUSTOMER',
    'PAYMENT_PENDING_AT_RELAY',
    'PAYMENT_RECEIVED_AT_RELAY',
    'PAYMENT_AWAITING_VALIDATION',
    'PAYMENT_VALIDATED',
    'PAYMENT_REJECTED',
    'PAYMENT_CONFIRMED_AWAITING_DROP'
);


--
-- Name: support_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_channel AS ENUM (
    'chatbot',
    'email',
    'contact_form',
    'manual'
);


--
-- Name: support_message_sender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_message_sender AS ENUM (
    'customer',
    'agent',
    'system'
);


--
-- Name: support_reminder_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_reminder_status AS ENUM (
    'pending',
    'completed',
    'cancelled'
);


--
-- Name: support_ticket_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_ticket_priority AS ENUM (
    'normal',
    'high',
    'urgent'
);


--
-- Name: support_ticket_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_ticket_status AS ENUM (
    'open',
    'pending',
    'resolved',
    'closed',
    'escalated'
);


--
-- Name: assign_shipment_to_transporter(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_shipment_to_transporter(p_shipment_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_origin_relay_id uuid;
  v_destination_relay_id uuid;
  v_home_delivery boolean;
  v_dest_commune text;
  v_dest_address text;
  v_relay_zone_id uuid;
  v_best_transporter_id uuid;
  v_min_score double precision := 999999;
  v_transporter record;
  v_distance_km double precision;
  v_current_load integer;
  v_score double precision;
BEGIN
  -- Get shipment details
  SELECT origin_relay_id, destination_relay_id, home_delivery, 
         recipient_commune, recipient_address
  INTO v_origin_relay_id, v_destination_relay_id, v_home_delivery,
       v_dest_commune, v_dest_address
  FROM shipments
  WHERE id = p_shipment_id;
  
  IF v_origin_relay_id IS NULL THEN
    RAISE EXCEPTION 'Shipment must have an origin relay point';
  END IF;
  
  -- Get the zone of the destination relay point (or origin if no destination)
  -- For home deliveries, we'll use the recipient commune to find matching zones
  IF v_home_delivery THEN
    -- For home deliveries, find zone by recipient commune
    SELECT dz.id INTO v_relay_zone_id
    FROM delivery_zones dz
    WHERE v_dest_commune = ANY(dz.communes)
    LIMIT 1;
  ELSE
    -- For relay deliveries, get zone from destination relay point
    SELECT zone_id INTO v_relay_zone_id
    FROM relay_points
    WHERE id = COALESCE(v_destination_relay_id, v_origin_relay_id);
  END IF;
  
  -- Find best available transporter, prioritizing those in the same zone
  FOR v_transporter IN
    SELECT t.id, t.user_id, t.vehicle_type, t.status, t.current_packages,
           u.relay_point_id as transporter_location_id,
           rp.latitude as transporter_lat,
           rp.longitude as transporter_lon,
           -- Check if transporter is assigned to the relay's zone
           CASE WHEN EXISTS (
             SELECT 1 FROM transporter_delivery_zones tdz
             WHERE tdz.transporter_id = t.id
               AND tdz.zone_id = v_relay_zone_id
           ) THEN true ELSE false END as is_in_zone
    FROM transporters t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN relay_points rp ON u.relay_point_id = rp.id
    WHERE t.status IN ('available', 'busy')
      AND t.current_packages < 10 -- Max load capacity
  LOOP
    -- Calculate distance score
    IF v_transporter.transporter_location_id IS NOT NULL THEN
      -- Transporter has a location, calculate distance to origin
      v_distance_km := get_relay_distance(v_transporter.transporter_location_id, v_origin_relay_id);
    ELSE
      -- No location, use default distance
      v_distance_km := 50; -- Default 50km
    END IF;
    
    -- Calculate current load (active assignments)
    SELECT COUNT(*) INTO v_current_load
    FROM transporter_assignments
    WHERE transporter_id = v_transporter.id
      AND assignment_status IN ('pending', 'picked_up');
    
    -- Calculate priority score (lower is better)
    -- Score = distance * 0.5 + (current_load * 10) * 0.3
    -- This prioritizes closer transporters and those with less load
    v_score := COALESCE(v_distance_km, 50) * 0.5 + (v_current_load * 10) * 0.3;
    
    -- Bonus for available status
    IF v_transporter.status = 'available' THEN
      v_score := v_score * 0.9; -- 10% bonus
    END IF;
    
    -- BIG BONUS for transporters in the same zone (50% reduction in score)
    IF v_relay_zone_id IS NOT NULL AND v_transporter.is_in_zone THEN
      v_score := v_score * 0.5; -- 50% bonus - prioritize zone transporters
    END IF;
    
    IF v_score < v_min_score THEN
      v_min_score := v_score;
      v_best_transporter_id := v_transporter.id;
    END IF;
  END LOOP;
  
  IF v_best_transporter_id IS NULL THEN
    RAISE EXCEPTION 'No available transporter found';
  END IF;
  
  -- Create assignment
  INSERT INTO transporter_assignments (
    transporter_id,
    shipment_id,
    relay_point_id,
    assignment_status,
    expected_pickup_at
  )
  VALUES (
    v_best_transporter_id,
    p_shipment_id,
    v_origin_relay_id,
    'pending',
    now() + interval '2 hours' -- Expected pickup in 2 hours
  )
  ON CONFLICT (transporter_id, shipment_id) DO UPDATE
  SET updated_at = now();
  
  -- Update shipment
  UPDATE shipments
  SET transporter_id = v_best_transporter_id,
      status = 'assigned'
  WHERE id = p_shipment_id;
  
  -- Update transporter current packages
  UPDATE transporters
  SET current_packages = current_packages + 1
  WHERE id = v_best_transporter_id;
  
  RETURN v_best_transporter_id;
END;
$$;


--
-- Name: FUNCTION assign_shipment_to_transporter(p_shipment_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.assign_shipment_to_transporter(p_shipment_id uuid) IS 'Assigns a shipment to the best available transporter, prioritizing transporters assigned to the relay point zone';


--
-- Name: ensure_single_default_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If setting this address as default, unset others
  IF NEW.is_default = true THEN
    UPDATE user_shipping_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ensure_single_default_recipient_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_recipient_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE recipient_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ensure_single_default_sender_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_sender_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE sender_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_pickup_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_pickup_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
      DECLARE
        code text;
        exists_check boolean;
      BEGIN
        LOOP
          code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
          SELECT EXISTS(SELECT 1 FROM shipments WHERE pickup_code = code) INTO exists_check;
          EXIT WHEN NOT exists_check;
        END LOOP;
        RETURN code;
      END;
      $$;


--
-- Name: FUNCTION generate_pickup_code(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_pickup_code() IS 'Generates a unique 6-digit pickup code for shipments';


--
-- Name: generate_relay_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_relay_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  code VARCHAR(6);
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit number (100000 to 999999)
    code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0');
    
    -- Check if code already exists in relay_points or transporters
    SELECT EXISTS(
      SELECT 1 FROM relay_points WHERE relay_code = code
      UNION
      SELECT 1 FROM transporters WHERE transporter_code = code
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;


--
-- Name: generate_shipment_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_shipment_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  code VARCHAR(6);
  digits VARCHAR(4);
  letters VARCHAR(2);
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 4 random digits
    digits := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Generate 2 random uppercase letters
    letters := CHR(65 + FLOOR(RANDOM() * 26)::INTEGER) || 
               CHR(65 + FLOOR(RANDOM() * 26)::INTEGER);
    
    -- Combine: 4 digits + 2 letters
    code := digits || letters;
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM shipments 
    WHERE shipment_code = code;
    
    -- Exit loop if code is unique
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$;


--
-- Name: generate_transporter_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_transporter_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  code VARCHAR(6);
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit number (100000 to 999999)
    code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM transporters WHERE transporter_code = code) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;


--
-- Name: log_shipment_state_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_shipment_state_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO shipment_status_history (
      shipment_id,
      status,
      previous_status,
      location,
      notes,
      updated_by,
      created_at
    ) VALUES (
      NEW.id,
      NEW.current_status::text,
      OLD.current_status::text,
      NULL,
      NULL,
      NEW.updated_by,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: process_shipment_scan(text, public.shipment_status, text, text, text, timestamp with time zone, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_shipment_scan(p_tracking_number text, p_new_status public.shipment_status, p_location_id text, p_scanner_id text, p_scanner_type text, p_timestamp timestamp with time zone, p_notes text, p_bypass_scanner_checks boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_shipment              RECORD;
  v_prev                  shipment_status;
  v_allowed               BOOLEAN := FALSE;
  v_err                   TEXT;
  v_relay_id              UUID;
  v_mobile_money_status   TEXT;
  v_relay_cash_status     TEXT;
BEGIN
  SELECT s.*,
         COALESCE(mmp.status::text, '') AS mobile_money_status,
         COALESCE(rcp.status::text, '') AS relay_cash_status
  INTO v_shipment
  FROM shipments s
  LEFT JOIN mobile_money_payments mmp ON mmp.shipment_id = s.id
  LEFT JOIN relay_cash_payments rcp ON rcp.shipment_id = s.id
  WHERE s.tracking_number = p_tracking_number
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Colis introuvable');
  END IF;

  v_prev := v_shipment.current_status;
  IF v_prev IS NULL THEN
    v_prev := 'READY_FOR_DROP_OFF';
  END IF;

  v_mobile_money_status := COALESCE(v_shipment.mobile_money_status, '');
  v_relay_cash_status   := COALESCE(v_shipment.relay_cash_status, '');

  IF p_scanner_type = 'relay' AND p_location_id IS NOT NULL THEN
    BEGIN
      v_relay_id := p_location_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_relay_id := NULL;
    END;
  ELSIF p_scanner_type = 'relay' AND p_scanner_id IS NOT NULL THEN
    SELECT relay_point_id INTO v_relay_id FROM users WHERE id = p_scanner_id::UUID;
  END IF;

  -- Vérification paiement avant réception relais d'origine
  IF p_new_status = 'RELAY_ORIGIN_RECEIVED' THEN
    IF v_shipment.payment_method = 'mobile_money' AND v_shipment.payment_status != 'paid' THEN
      IF v_mobile_money_status != 'approved' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Le paiement Mobile Money n''est pas encore validé. Veuillez attendre la validation du paiement.'
        );
      END IF;
    END IF;
    IF v_shipment.payment_method NOT IN ('mobile_money', 'relay_cash') THEN
      IF v_shipment.payment_status != 'paid' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Le paiement n''est pas encore confirmé. Veuillez attendre la confirmation du paiement.'
        );
      END IF;
    END IF;
  END IF;

  -- Transitions autorisées
  IF p_bypass_scanner_checks AND p_new_status IN ('CANCELLED', 'RETURN_TO_SENDER') THEN
    v_allowed := TRUE;

  ELSIF v_prev = 'READY_FOR_DROP_OFF' AND p_new_status = 'RELAY_ORIGIN_RECEIVED' THEN
    IF p_bypass_scanner_checks OR p_scanner_type = 'relay' THEN
      v_allowed := TRUE;
      IF v_shipment.origin_relay_id IS NULL AND v_relay_id IS NOT NULL THEN
        v_shipment.origin_relay_id := v_relay_id;
      END IF;
    ELSE
      v_err := 'Scan non autorisé: seul un relais peut réceptionner.';
    END IF;

  ELSIF v_prev IN ('READY_FOR_DROP_OFF', 'PICKUP_PENDING', 'PAYMENT_CONFIRMED_AWAITING_DROP') AND p_new_status = 'CARRIER_COLLECTED' THEN
    IF v_shipment.payment_method = 'mobile_money' AND v_shipment.payment_status != 'paid' THEN
      IF v_mobile_money_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le paiement Mobile Money n''est pas encore validé.');
      END IF;
    END IF;
    IF v_shipment.payment_method NOT IN ('mobile_money', 'relay_cash') AND v_shipment.payment_status != 'paid' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Le paiement n''est pas encore confirmé.');
    END IF;
    IF p_bypass_scanner_checks OR p_scanner_type = 'transporter' THEN
      v_allowed := TRUE;
    ELSE
      v_err := 'Scan non autorisé: seul un transporteur peut enlever un colis.';
    END IF;

  ELSIF v_prev = 'READY_FOR_DROP_OFF' AND p_new_status = 'DELIVERED_TO_CUSTOMER' THEN
    IF v_shipment.payment_method = 'mobile_money' AND v_shipment.payment_status != 'paid' THEN
      IF v_mobile_money_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le paiement Mobile Money n''est pas encore validé.');
      END IF;
    END IF;
    IF v_shipment.payment_method NOT IN ('mobile_money', 'relay_cash') AND v_shipment.payment_status != 'paid' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Le paiement n''est pas encore confirmé.');
    END IF;
    IF (p_bypass_scanner_checks OR p_scanner_type = 'transporter') AND v_shipment.origin_relay_id IS NULL THEN
      v_allowed := TRUE;
    ELSE
      v_err := 'Livraison directe autorisée uniquement pour les colis avec ramassage à domicile.';
    END IF;

  ELSIF v_prev = 'RELAY_ORIGIN_RECEIVED' AND p_new_status = 'CARRIER_COLLECTED' THEN
    IF p_bypass_scanner_checks OR p_scanner_type = 'transporter' THEN
      v_allowed := TRUE;
    ELSE
      v_err := 'Scan non autorisé: seul un transporteur peut enlever un colis.';
    END IF;

  ELSIF v_prev = 'CARRIER_COLLECTED' AND p_new_status = 'RELAY_ORIGIN_RECEIVED' THEN
    IF p_bypass_scanner_checks OR p_scanner_type = 'relay' THEN
      v_allowed := TRUE;
      IF v_shipment.origin_relay_id IS NULL AND v_relay_id IS NOT NULL THEN
        v_shipment.origin_relay_id := v_relay_id;
      END IF;
    ELSE
      v_err := 'Scan non autorisé: seul un relais peut réceptionner.';
    END IF;

  ELSIF v_prev = 'CARRIER_COLLECTED' AND p_new_status = 'IN_TRANSIT' THEN
    v_allowed := TRUE;

  ELSIF v_prev = 'IN_TRANSIT' AND p_new_status = 'RELAY_FINAL_RECEIVED' THEN
    IF p_bypass_scanner_checks OR p_scanner_type = 'relay' THEN
      IF v_shipment.destination_relay_id IS NOT NULL AND v_relay_id IS NOT NULL
         AND v_relay_id::text <> v_shipment.destination_relay_id::text THEN
        v_err := 'Colis non destiné à ce relais final.';
      ELSE
        v_allowed := TRUE;
        IF v_shipment.destination_relay_id IS NULL AND v_relay_id IS NOT NULL THEN
          v_shipment.destination_relay_id := v_relay_id;
        END IF;
      END IF;
    ELSE
      v_err := 'Scan non autorisé: seul un relais peut réceptionner.';
    END IF;

  ELSIF v_prev = 'IN_TRANSIT' AND p_new_status = 'DELIVERED_TO_CUSTOMER' THEN
    IF v_shipment.payment_method = 'mobile_money' AND v_shipment.payment_status != 'paid' THEN
      IF v_mobile_money_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le paiement Mobile Money n''est pas encore validé.');
      END IF;
    END IF;
    IF v_shipment.payment_method NOT IN ('mobile_money', 'relay_cash') AND v_shipment.payment_status != 'paid' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Le paiement n''est pas encore confirmé.');
    END IF;
    IF p_bypass_scanner_checks OR p_scanner_type = 'transporter' THEN
      v_allowed := TRUE;
    ELSE
      v_err := 'Scan non autorisé: seul un transporteur peut livrer.';
    END IF;

  ELSIF v_prev = 'IN_TRANSIT' AND p_new_status = 'DELIVERED' THEN
    IF p_bypass_scanner_checks OR p_scanner_type = 'transporter' THEN
      v_allowed := TRUE;
    ELSE
      v_err := 'Scan non autorisé: seul un transporteur peut marquer un colis comme livré.';
    END IF;

  ELSIF v_prev = 'RELAY_FINAL_RECEIVED' AND p_new_status = 'AVAILABLE_FOR_PICKUP' THEN
    v_allowed := TRUE;

  ELSIF v_prev = 'AVAILABLE_FOR_PICKUP' AND p_new_status = 'PICKED_UP_BY_CUSTOMER' THEN
    v_allowed := TRUE;

  ELSE
    v_err := format('Transition interdite: %s -> %s', v_prev, p_new_status);
  END IF;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_err, 'Transition non autorisée'));
  END IF;

  UPDATE shipments
  SET current_status = p_new_status,
      -- Génère le pickup_code à la 1ère réception relais OU à la 1ère prise en charge
      -- transporteur (y compris depuis PICKUP_PENDING = ramassage à domicile)
      pickup_code = CASE
        WHEN COALESCE(pickup_code, '') = ''
             AND (
               p_new_status = 'RELAY_ORIGIN_RECEIVED'::shipment_status
               OR (
                 p_new_status = 'CARRIER_COLLECTED'::shipment_status
                 AND v_prev IN (
                   'READY_FOR_DROP_OFF'::shipment_status,
                   'PICKUP_PENDING'::shipment_status,
                   'PAYMENT_CONFIRMED_AWAITING_DROP'::shipment_status
                 )
               )
             )
        THEN generate_pickup_code()
        ELSE pickup_code
      END,
      origin_relay_id = COALESCE(
        v_shipment.origin_relay_id,
        CASE WHEN p_new_status = 'RELAY_ORIGIN_RECEIVED' AND v_relay_id IS NOT NULL THEN v_relay_id ELSE origin_relay_id END
      ),
      destination_relay_id = COALESCE(
        v_shipment.destination_relay_id,
        CASE WHEN p_new_status = 'RELAY_FINAL_RECEIVED' AND v_relay_id IS NOT NULL THEN v_relay_id ELSE destination_relay_id END
      ),
      updated_at = NOW()
  WHERE id = v_shipment.id;

  INSERT INTO tracking_events (
    shipment_id, tracking_number, status, location_id, scanner_id, scanner_type, notes, "timestamp"
  ) VALUES (
    v_shipment.id, p_tracking_number, p_new_status,
    p_location_id, p_scanner_id, p_scanner_type, p_notes,
    COALESCE(p_timestamp, NOW())
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Scan traité avec succès',
    'tracking_number', p_tracking_number,
    'previous_status', v_prev,
    'new_status', p_new_status,
    'shipment_id', v_shipment.id
  );
END;
$$;


--
-- Name: FUNCTION process_shipment_scan(p_tracking_number text, p_new_status public.shipment_status, p_location_id text, p_scanner_id text, p_scanner_type text, p_timestamp timestamp with time zone, p_notes text, p_bypass_scanner_checks boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_shipment_scan(p_tracking_number text, p_new_status public.shipment_status, p_location_id text, p_scanner_id text, p_scanner_type text, p_timestamp timestamp with time zone, p_notes text, p_bypass_scanner_checks boolean) IS 'Traite les scans de colis avec vérifications paiement.
   pickup_code généré à RELAY_ORIGIN_RECEIVED ou 1er CARRIER_COLLECTED (depuis READY_FOR_DROP_OFF, PICKUP_PENDING ou PAYMENT_CONFIRMED_AWAITING_DROP).
   PICKUP_PENDING → CARRIER_COLLECTED : ramassage à domicile confirmé par transporteur.
   IN_TRANSIT → DELIVERED : livraison directe à domicile.
   p_bypass_scanner_checks=TRUE : transitions admin (CANCELLED, RETURN_TO_SENDER) ou confirm-home-pickup.';


--
-- Name: refresh_all_relay_daily_metrics(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_all_relay_daily_metrics(p_metric_date date DEFAULT NULL::date) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM relay_points LOOP
    PERFORM refresh_relay_daily_metrics(rec.id, p_metric_date);
  END LOOP;
END;
$$;


--
-- Name: refresh_relay_daily_metrics(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_relay_daily_metrics(p_relay_id uuid, p_metric_date date DEFAULT NULL::date) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  tz CONSTANT text := 'Africa/Abidjan';
BEGIN
  IF p_relay_id IS NULL THEN
    RAISE EXCEPTION 'relay id must not be null';
  END IF;

  IF p_metric_date IS NULL THEN
    DELETE FROM relay_point_daily_metrics WHERE relay_point_id = p_relay_id;
  ELSE
    DELETE FROM relay_point_daily_metrics
    WHERE relay_point_id = p_relay_id
      AND metric_date = p_metric_date;
  END IF;

  WITH base AS (
    SELECT
      origin_relay_id AS relay_point_id,
      (created_at AT TIME ZONE tz)::date AS metric_date,
      payment_status,
      COALESCE(NULLIF(payment_method, ''), 'unknown') AS payment_method,
      (price + COALESCE(printing_fee, 0) + COALESCE(assistance_fee, 0) + COALESCE(box_price, 0))::numeric AS total_amount,
      relay_assisted,
      COALESCE(assistance_fee, 0)::numeric AS assistance_fee,
      COALESCE(printing_fee, 0)::numeric AS printing_fee,
      home_delivery
    FROM shipments
    WHERE origin_relay_id = p_relay_id
      AND (p_metric_date IS NULL OR (created_at AT TIME ZONE tz)::date = p_metric_date)
  ),
  aggregated AS (
    SELECT
      relay_point_id,
      metric_date,
      COUNT(*) AS shipments_total,
      COUNT(*) FILTER (WHERE payment_status = 'paid') AS shipments_paid,
      SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END)::numeric AS revenue_total,
      SUM(CASE WHEN relay_assisted THEN 1 ELSE 0 END)::int AS assisted_count,
      SUM(CASE WHEN relay_assisted THEN assistance_fee ELSE 0 END)::numeric AS assistance_revenue,
      SUM(printing_fee)::numeric AS printing_revenue,
      SUM(COALESCE(assistance_fee, 0) + COALESCE(printing_fee, 0))::numeric AS commissions_total,
      SUM(CASE WHEN home_delivery THEN 1 ELSE 0 END)::int AS home_delivery_count,
      SUM(CASE WHEN NOT home_delivery THEN 1 ELSE 0 END)::int AS relay_delivery_count
    FROM base
    GROUP BY relay_point_id, metric_date
  ),
  payments AS (
    SELECT
      relay_point_id,
      metric_date,
      jsonb_object_agg(
        payment_method,
        jsonb_build_object(
          'count', paid_count,
          'amount', paid_amount
        )
      ) AS payment_breakdown
    FROM (
      SELECT
        relay_point_id,
        metric_date,
        payment_method,
        COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid_count,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS paid_amount
      FROM base
      GROUP BY relay_point_id, metric_date, payment_method
    ) method_totals
    GROUP BY relay_point_id, metric_date
  )
  INSERT INTO relay_point_daily_metrics (
    relay_point_id,
    metric_date,
    shipments_total,
    shipments_paid,
    revenue_total,
    payment_breakdown,
    assisted_count,
    assistance_revenue,
    printing_revenue,
    commissions_total,
    home_delivery_count,
    relay_delivery_count,
    created_at,
    updated_at
  )
  SELECT
    a.relay_point_id,
    a.metric_date,
    COALESCE(a.shipments_total, 0),
    COALESCE(a.shipments_paid, 0),
    COALESCE(a.revenue_total, 0),
    COALESCE(p.payment_breakdown, '{}'::jsonb),
    COALESCE(a.assisted_count, 0),
    COALESCE(a.assistance_revenue, 0),
    COALESCE(a.printing_revenue, 0),
    COALESCE(a.commissions_total, 0),
    COALESCE(a.home_delivery_count, 0),
    COALESCE(a.relay_delivery_count, 0),
    now(),
    now()
  FROM aggregated a
  LEFT JOIN payments p
    ON p.relay_point_id = a.relay_point_id
   AND p.metric_date = a.metric_date;
END;
$$;


--
-- Name: set_relay_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_relay_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.relay_code IS NULL OR NEW.relay_code = '' THEN
    NEW.relay_code := generate_relay_code();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_support_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_support_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_transporter_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_transporter_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.transporter_code IS NULL OR NEW.transporter_code = '' THEN
    NEW.transporter_code := generate_transporter_code();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_mobile_money_channels(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_mobile_money_channels() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_mobile_money_payments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_mobile_money_payments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_relay_cash_payments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_relay_cash_payments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_additional_options_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_additional_options_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_admin_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_admin_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_daily_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_statistics() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO daily_statistics (
    date,
    total_shipments,
    total_revenue,
    delivered_count,
    in_transit_count,
    pending_count,
    new_users,
    active_relays
  )
  SELECT 
    DATE(now()) AS date,
    (SELECT COUNT(*) FROM shipments WHERE DATE(created_at) = DATE(now())) AS total_shipments,
    (SELECT COALESCE(SUM(price), 0) FROM shipments WHERE DATE(created_at) = DATE(now()) AND payment_status = 'paid') AS total_revenue,
    (SELECT COUNT(*) FROM shipments WHERE current_status IN ('PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER') AND DATE(updated_at) = DATE(now())) AS delivered_count,
    (SELECT COUNT(*) FROM shipments WHERE current_status = 'IN_TRANSIT') AS in_transit_count,
    (SELECT COUNT(*) FROM shipments WHERE current_status IN ('READY_FOR_DROP_OFF','RELAY_ORIGIN_RECEIVED') AND DATE(created_at) = DATE(now())) AS pending_count,
    (SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE(now())) AS new_users,
    (SELECT COUNT(*) FROM relay_points WHERE is_active = true) AS active_relays
  ON CONFLICT (date) DO UPDATE SET
    total_shipments = EXCLUDED.total_shipments,
    total_revenue = EXCLUDED.total_revenue,
    delivered_count = EXCLUDED.delivered_count,
    in_transit_count = EXCLUDED.in_transit_count,
    pending_count = EXCLUDED.pending_count,
    new_users = EXCLUDED.new_users,
    active_relays = EXCLUDED.active_relays,
    updated_at = NOW();
END;
$$;


--
-- Name: update_delivery_zone_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_delivery_zone_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_job_applications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_job_applications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_job_postings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_job_postings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_pricing_grids_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pricing_grids_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_pricing_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pricing_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_pro_address_book_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pro_address_book_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_relay_application_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_relay_application_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_transporter_delivery_zone_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_transporter_delivery_zone_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_status_transition(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_status_transition(current_status text, new_status text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Define allowed transitions
  -- Note: This should match your business logic
  CASE current_status
    WHEN 'pending' THEN
      RETURN new_status IN ('paid', 'cancelled');
    WHEN 'paid' THEN
      RETURN new_status IN ('in_transit', 'at_relay', 'cancelled');
    WHEN 'in_transit' THEN
      RETURN new_status IN ('at_relay', 'out_for_delivery', 'delivered', 'cancelled');
    WHEN 'at_relay' THEN
      RETURN new_status IN ('in_transit', 'out_for_delivery', 'delivered', 'cancelled');
    WHEN 'out_for_delivery' THEN
      RETURN new_status IN ('delivered', 'returned', 'at_relay', 'cancelled');
    WHEN 'delivered' THEN
      RETURN false; -- Cannot change from delivered
    WHEN 'cancelled' THEN
      RETURN false; -- Cannot change from cancelled
    WHEN 'returned' THEN
      RETURN new_status IN ('at_relay', 'in_transit', 'cancelled');
    ELSE
      -- Unknown status, allow transition (for flexibility)
      RETURN true;
  END CASE;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: additional_pricing_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.additional_pricing_options (
    id integer NOT NULL,
    option_key character varying(50) NOT NULL,
    option_name character varying(255) NOT NULL,
    option_description text,
    price_type character varying(20) NOT NULL,
    price_value numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: additional_pricing_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.additional_pricing_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: additional_pricing_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.additional_pricing_options_id_seq OWNED BY public.additional_pricing_options.id;


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key_prefix character varying(16) NOT NULL,
    key_hash text NOT NULL,
    partner_name text NOT NULL,
    partner_email text,
    description text,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    rate_limit_per_min integer DEFAULT 60 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_usage_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    api_key_id uuid,
    method text NOT NULL,
    path text NOT NULL,
    status_code integer,
    response_time_ms integer,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_webhook_deliveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    webhook_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now(),
    http_status integer,
    response_body text,
    last_error text,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT api_webhook_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text])))
);


--
-- Name: api_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_webhooks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    api_key_id uuid NOT NULL,
    url text NOT NULL,
    signing_secret text NOT NULL,
    events text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    last_triggered_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: automated_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automated_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid,
    tracking_number character varying(50) NOT NULL,
    provider character varying(20) NOT NULL,
    transaction_id character varying(255),
    amount integer NOT NULL,
    currency character varying(10) DEFAULT 'XOF'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_url text,
    raw_response jsonb,
    webhook_received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT automated_payments_provider_check CHECK (((provider)::text = ANY (ARRAY['paystack'::text, 'cinetpay'::text, 'mobile_money'::text, 'batch_pending'::text]))),
    CONSTRAINT automated_payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: customer_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_response text,
    admin_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    responded_at timestamp with time zone,
    support_ticket_id uuid,
    unread boolean DEFAULT false,
    last_response_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    CONSTRAINT customer_messages_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: TABLE customer_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_messages IS 'Stores messages from clients to customer service';


--
-- Name: COLUMN customer_messages.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_messages.user_id IS 'Client who sent the message';


--
-- Name: COLUMN customer_messages.subject; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_messages.subject IS 'Subject/title of the message';


--
-- Name: COLUMN customer_messages.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_messages.message IS 'Content of the message';


--
-- Name: COLUMN customer_messages.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_messages.status IS 'Status: pending, in_progress, resolved, closed';


--
-- Name: COLUMN customer_messages.admin_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_messages.admin_response IS 'Response from customer service';


--
-- Name: COLUMN customer_messages.admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_messages.admin_id IS 'Admin/support agent who responded';


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    communes text[],
    min_latitude numeric(10,8),
    max_latitude numeric(10,8),
    min_longitude numeric(11,8),
    max_longitude numeric(11,8),
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE delivery_zones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.delivery_zones IS 'Geographical delivery zones that can be assigned to transporters';


--
-- Name: COLUMN delivery_zones.communes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_zones.communes IS 'Array of commune names covered by this zone';


--
-- Name: COLUMN delivery_zones.min_latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_zones.min_latitude IS 'Minimum latitude of bounding box (optional)';


--
-- Name: COLUMN delivery_zones.max_latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_zones.max_latitude IS 'Maximum latitude of bounding box (optional)';


--
-- Name: COLUMN delivery_zones.min_longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_zones.min_longitude IS 'Minimum longitude of bounding box (optional)';


--
-- Name: COLUMN delivery_zones.max_longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_zones.max_longitude IS 'Maximum longitude of bounding box (optional)';


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_posting_id uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    cover_letter text,
    cv_file_path text,
    cv_file_name character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE job_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.job_applications IS 'Job applications submitted by candidates';


--
-- Name: COLUMN job_applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_applications.status IS 'Application status: pending, reviewed, rejected, accepted';


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    department character varying(100),
    location character varying(255),
    employment_type character varying(50),
    description text NOT NULL,
    requirements text,
    benefits text,
    salary_range character varying(100),
    application_email character varying(255),
    application_url text,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    posted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: TABLE job_postings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.job_postings IS 'Job postings for the career page';


--
-- Name: COLUMN job_postings.employment_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_postings.employment_type IS 'Type of employment: full-time, part-time, contract, internship';


--
-- Name: COLUMN job_postings.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_postings.is_active IS 'Whether the job posting is currently active and visible';


--
-- Name: COLUMN job_postings.is_featured; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_postings.is_featured IS 'Whether the job posting should be featured on the career page';


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: mobile_money_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobile_money_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    declared_by_user_id uuid,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'FCFA'::text NOT NULL,
    provider text NOT NULL,
    payer_phone text NOT NULL,
    status public.mobile_money_payment_status DEFAULT 'pending'::public.mobile_money_payment_status NOT NULL,
    notes text,
    rejection_reason text,
    validated_by uuid,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    related_entity_type text,
    related_entity_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pricing_grids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_grids (
    id integer NOT NULL,
    weight_min numeric(5,2) NOT NULL,
    weight_max numeric(5,2) NOT NULL,
    price_intra_commune numeric(10,2) NOT NULL,
    price_inter_commune numeric(10,2) NOT NULL,
    supplement_per_kg_intra numeric(10,2) DEFAULT 0,
    supplement_per_kg_inter numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivery_mode character varying(20) DEFAULT 'relay'::character varying NOT NULL,
    grid_type character varying(20),
    package_size character varying(20),
    CONSTRAINT pricing_grids_delivery_mode_check CHECK (((delivery_mode)::text = ANY ((ARRAY['relay'::character varying, 'home'::character varying])::text[]))),
    CONSTRAINT pricing_grids_grid_type_check CHECK (((grid_type)::text = ANY ((ARRAY['courier'::character varying, 'colis'::character varying])::text[]))),
    CONSTRAINT pricing_grids_package_size_check CHECK (((((grid_type)::text = 'courier'::text) AND (package_size IS NULL)) OR (((grid_type)::text = 'colis'::text) AND ((package_size)::text = ANY ((ARRAY['petit'::character varying, 'moyen'::character varying, 'grand'::character varying])::text[])))))
);


--
-- Name: COLUMN pricing_grids.delivery_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_grids.delivery_mode IS 'Delivery mode: relay (point relais) or home (livraison à domicile)';


--
-- Name: COLUMN pricing_grids.grid_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_grids.grid_type IS 'Type principal: courier (courrier/documents, pas de catégories) ou colis (avec catégories petit/moyen/grand)';


--
-- Name: COLUMN pricing_grids.package_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_grids.package_size IS 'Taille pour les colis: petit (0-5kg), moyen (5.5-10kg), grand (>10kg). NULL pour courier.';


--
-- Name: pricing_grids_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pricing_grids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pricing_grids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pricing_grids_id_seq OWNED BY public.pricing_grids.id;


--
-- Name: pricing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_settings (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    base_price numeric(10,2) DEFAULT 0 NOT NULL,
    price_per_kg numeric(10,2) DEFAULT 0 NOT NULL,
    printing_fee numeric(10,2) DEFAULT 0 NOT NULL,
    assistance_fee numeric(10,2) DEFAULT 0 NOT NULL,
    box_price numeric(10,2) DEFAULT 0 NOT NULL,
    min_weight numeric(5,2) DEFAULT 0,
    max_weight numeric(5,2) DEFAULT 50,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pricing_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pricing_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pricing_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pricing_settings_id_seq OWNED BY public.pricing_settings.id;


--
-- Name: pro_address_book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pro_address_book (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    recipient_first_name text NOT NULL,
    recipient_last_name text NOT NULL,
    recipient_email text,
    recipient_phone text NOT NULL,
    recipient_commune text NOT NULL,
    recipient_quartier text NOT NULL,
    recipient_address text NOT NULL,
    label text,
    notes text,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pro_business_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pro_business_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    company_name text NOT NULL,
    company_registration text,
    business_address text,
    monthly_volume integer DEFAULT 0,
    total_shipments integer DEFAULT 0,
    billing_email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: recipient_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipient_addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text NOT NULL,
    commune text NOT NULL,
    quartier text NOT NULL,
    address text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: relay_cash_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relay_cash_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    relay_point_id uuid,
    amount_expected numeric(14,2) DEFAULT 0 NOT NULL,
    amount_collected numeric(14,2),
    status public.relay_cash_payment_status DEFAULT 'pending'::public.relay_cash_payment_status NOT NULL,
    collected_by uuid,
    collected_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    collection_location character varying(20),
    CONSTRAINT relay_cash_payments_collection_location_check CHECK (((collection_location)::text = ANY ((ARRAY['relay'::character varying, 'transporter'::character varying])::text[])))
);


--
-- Name: COLUMN relay_cash_payments.collection_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_cash_payments.collection_location IS 'Lieu de collecte du paiement: relay (point relais) ou transporter (transporteur lors de la prise en charge)';


--
-- Name: relay_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relay_partners (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    relay_point_id uuid,
    monthly_revenue integer DEFAULT 0,
    total_packages_handled integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: relay_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relay_points (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    commune text NOT NULL,
    quartier text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    whatsapp text,
    hours text,
    latitude double precision,
    longitude double precision,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    printing_fee numeric(10,2) DEFAULT 100,
    assistance_fee numeric(10,2) DEFAULT 500,
    status character varying(50) DEFAULT 'active'::character varying,
    description text,
    photo_urls text[],
    has_storage_space boolean DEFAULT false,
    application_id uuid,
    has_computer boolean DEFAULT false,
    has_printer boolean DEFAULT false,
    has_internet boolean DEFAULT true,
    email character varying(255),
    created_by uuid,
    updated_by uuid,
    zone_id uuid,
    relay_code character varying(6),
    CONSTRAINT relay_points_type_check CHECK ((type = ANY (ARRAY['cybercafe'::text, 'imprimerie'::text, 'superette'::text])))
);


--
-- Name: COLUMN relay_points.printing_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.printing_fee IS 'Printing fee (per document) in FCFA';


--
-- Name: COLUMN relay_points.assistance_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.assistance_fee IS 'Assistance fee in FCFA';


--
-- Name: COLUMN relay_points.has_computer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.has_computer IS 'Indicates if the relay point has a computer available';


--
-- Name: COLUMN relay_points.has_printer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.has_printer IS 'Indicates if the relay point has a printer available';


--
-- Name: COLUMN relay_points.has_internet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.has_internet IS 'Indicates if the relay point has internet connection';


--
-- Name: COLUMN relay_points.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.email IS 'Email address of the relay point';


--
-- Name: COLUMN relay_points.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.created_by IS 'User ID who created this relay point (usually admin approving application)';


--
-- Name: COLUMN relay_points.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.updated_by IS 'User ID who last updated this relay point';


--
-- Name: COLUMN relay_points.zone_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_points.zone_id IS 'Delivery zone this relay point belongs to (optional)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text DEFAULT ''::text,
    last_name text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    role text DEFAULT 'client'::text NOT NULL,
    relay_point_id uuid,
    is_pro boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address text,
    commune character varying(255),
    quartier character varying(255),
    country_code character varying(10) DEFAULT '+225'::character varying,
    ville character varying(255),
    complement_adresse text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'client'::text, 'pro'::text, 'admin'::text, 'relay_partner'::text, 'transporter'::text, 'support'::text, 'support_supervisor'::text])))
);


--
-- Name: COLUMN users.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.address IS 'Full street address of the user';


--
-- Name: COLUMN users.commune; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.commune IS 'Commune (district) of the user';


--
-- Name: COLUMN users.quartier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.quartier IS 'Quartier (neighborhood) of the user';


--
-- Name: COLUMN users.country_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.country_code IS 'Country code for phone number (e.g., +225 for Côte d''Ivoire)';


--
-- Name: COLUMN users.ville; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.ville IS 'City name for user address';


--
-- Name: COLUMN users.complement_adresse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.complement_adresse IS 'Address complement (e.g., apartment number, building name)';


--
-- Name: relay_partners_without_relay; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.relay_partners_without_relay AS
 SELECT u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.created_at,
    count(rp.id) AS available_relay_points
   FROM (public.users u
     CROSS JOIN public.relay_points rp)
  WHERE ((u.role = 'relay_partner'::text) AND (u.relay_point_id IS NULL))
  GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at;


--
-- Name: VIEW relay_partners_without_relay; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.relay_partners_without_relay IS 'Lists relay_partner users who need a relay_point_id assigned';


--
-- Name: relay_point_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relay_point_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    applicant_first_name character varying(255) NOT NULL,
    applicant_last_name character varying(255) NOT NULL,
    business_name character varying(255) NOT NULL,
    business_type character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255) NOT NULL,
    commune character varying(255) NOT NULL,
    quartier character varying(255) NOT NULL,
    address text NOT NULL,
    address_complement text,
    description text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    city character varying(255),
    hours text,
    has_storage_space boolean DEFAULT false,
    photo_urls text[],
    status public.application_status DEFAULT 'pending'::public.application_status,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_relay_point_id uuid
);


--
-- Name: TABLE relay_point_applications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.relay_point_applications IS 'Applications submitted by users to become relay points';


--
-- Name: COLUMN relay_point_applications.latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_applications.latitude IS 'GPS latitude captured automatically when application is submitted';


--
-- Name: COLUMN relay_point_applications.longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_applications.longitude IS 'GPS longitude captured automatically when application is submitted';


--
-- Name: COLUMN relay_point_applications.photo_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_applications.photo_urls IS 'Array of photo URLs/paths for the business location';


--
-- Name: COLUMN relay_point_applications.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_applications.status IS 'Application status: pending, approved, rejected, on_hold';


--
-- Name: COLUMN relay_point_applications.approved_relay_point_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_applications.approved_relay_point_id IS 'Link to the created relay_point if application is approved';


--
-- Name: relay_point_daily_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relay_point_daily_metrics (
    relay_point_id uuid NOT NULL,
    metric_date date NOT NULL,
    shipments_total integer DEFAULT 0 NOT NULL,
    shipments_paid integer DEFAULT 0 NOT NULL,
    revenue_total numeric(14,2) DEFAULT 0 NOT NULL,
    payment_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    assisted_count integer DEFAULT 0 NOT NULL,
    assistance_revenue numeric(14,2) DEFAULT 0 NOT NULL,
    printing_revenue numeric(14,2) DEFAULT 0 NOT NULL,
    commissions_total numeric(14,2) DEFAULT 0 NOT NULL,
    home_delivery_count integer DEFAULT 0 NOT NULL,
    relay_delivery_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: relay_point_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relay_point_metrics (
    relay_point_id uuid NOT NULL,
    pending_pickups integer DEFAULT 0 NOT NULL,
    pending_deliveries integer DEFAULT 0 NOT NULL,
    completed_today integer DEFAULT 0 NOT NULL,
    monthly_revenue numeric(14,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE relay_point_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.relay_point_metrics IS 'Stores cached dashboard metrics for each relay point';


--
-- Name: COLUMN relay_point_metrics.pending_pickups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_metrics.pending_pickups IS 'Number of shipments waiting for collection at origin relay';


--
-- Name: COLUMN relay_point_metrics.pending_deliveries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_metrics.pending_deliveries IS 'Number of shipments in transit towards the relay or awaiting customer pickup';


--
-- Name: COLUMN relay_point_metrics.completed_today; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_metrics.completed_today IS 'Completed handoffs today (delivered or picked up)';


--
-- Name: COLUMN relay_point_metrics.monthly_revenue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relay_point_metrics.monthly_revenue IS 'Revenue generated this month (origin relay fees + extras)';


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tracking_number text NOT NULL,
    sender_first_name text NOT NULL,
    sender_last_name text NOT NULL,
    sender_email text,
    sender_phone text NOT NULL,
    sender_commune text NOT NULL,
    sender_quartier text NOT NULL,
    sender_address text NOT NULL,
    recipient_first_name text NOT NULL,
    recipient_last_name text NOT NULL,
    recipient_email text,
    recipient_phone text NOT NULL,
    recipient_commune text NOT NULL,
    recipient_quartier text NOT NULL,
    recipient_address text NOT NULL,
    package_type text NOT NULL,
    weight double precision NOT NULL,
    price double precision NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    print_at_relay boolean DEFAULT false,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    origin_relay_id uuid,
    destination_relay_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    box_price numeric DEFAULT 0,
    current_status public.shipment_status DEFAULT 'READY_FOR_DROP_OFF'::public.shipment_status,
    printing_fee numeric(12,2) DEFAULT 0,
    assistance_fee numeric(12,2) DEFAULT 0,
    pickup_code_verified_at timestamp with time zone,
    pickup_code_verified_by uuid,
    pickup_code text,
    shipment_code character varying(6) DEFAULT public.generate_shipment_code(),
    home_delivery boolean DEFAULT false,
    relay_assisted boolean DEFAULT false,
    transporter_id uuid,
    created_by uuid,
    updated_by uuid,
    sender_repere text,
    recipient_repere text,
    pickup_method character varying(20) DEFAULT 'relay_deposit'::character varying,
    CONSTRAINT shipments_package_type_check CHECK ((package_type = ANY (ARRAY['petit'::text, 'moyen'::text, 'grand'::text]))),
    CONSTRAINT shipments_payment_method_check CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['mobile_money'::text, 'relay_cash'::text, 'card'::text])))),
    CONSTRAINT shipments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN shipments.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.payment_status IS 'Payment status: pending (not paid), paid (payment completed), cancelled (payment cancelled/refunded)';


--
-- Name: COLUMN shipments.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.payment_method IS 'Payment method: mobile_money (Mobile Money - Orange, Wave, Moov, MTN), relay_cash (Cash at relay point or transporter), card (Stripe card payment). Note: PayPal and business_account are not yet implemented.';


--
-- Name: COLUMN shipments.box_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.box_price IS 'Fee charged for shipping box (in FCFA)';


--
-- Name: COLUMN shipments.pickup_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.pickup_code IS '6-digit code for recipient to pick up shipment at relay point';


--
-- Name: COLUMN shipments.shipment_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.shipment_code IS 'Numéro d''envoi (4 chiffres + 2 lettres) écrit sur le colis, utilisé pour l''enregistrement par le relais et le transporteur';


--
-- Name: COLUMN shipments.sender_repere; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.sender_repere IS 'Point de repère optionnel pour localiser l''adresse expéditeur (ex: en face de la pharmacie)';


--
-- Name: COLUMN shipments.recipient_repere; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.recipient_repere IS 'Point de repère optionnel pour localiser l''adresse destinataire';


--
-- Name: COLUMN shipments.pickup_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipments.pickup_method IS 'Mode de d\u00e9p\u00f4t : relay_deposit (client dépose au relais) ou home_pickup (transporteur vient chercher)';


--
-- Name: relay_point_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.relay_point_performance AS
 SELECT rp.id,
    rp.name,
    rp.commune,
    count(DISTINCT s.id) FILTER (WHERE (s.origin_relay_id = rp.id)) AS pickups_count,
    count(DISTINCT s.id) FILTER (WHERE (s.destination_relay_id = rp.id)) AS deliveries_count,
    sum(s.price) FILTER (WHERE ((s.origin_relay_id = rp.id) OR (s.destination_relay_id = rp.id))) AS total_revenue,
    count(DISTINCT s.id) FILTER (WHERE ((s.current_status = ANY (ARRAY['PICKED_UP_BY_CUSTOMER'::public.shipment_status, 'DELIVERED'::public.shipment_status, 'DELIVERED_TO_CUSTOMER'::public.shipment_status])) AND ((s.origin_relay_id = rp.id) OR (s.destination_relay_id = rp.id)))) AS completed_count
   FROM (public.relay_points rp
     LEFT JOIN public.shipments s ON (((s.origin_relay_id = rp.id) OR (s.destination_relay_id = rp.id))))
  GROUP BY rp.id, rp.name, rp.commune;


--
-- Name: sender_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sender_addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text NOT NULL,
    commune text NOT NULL,
    quartier text NOT NULL,
    address text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: shipment_handoffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_handoffs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    from_type text NOT NULL,
    from_id uuid NOT NULL,
    to_type text NOT NULL,
    to_id uuid NOT NULL,
    scanned_by_user_id uuid,
    handoff_type text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shipment_handoffs_from_type_check CHECK ((from_type = ANY (ARRAY['relay'::text, 'transporter'::text]))),
    CONSTRAINT shipment_handoffs_handoff_type_check CHECK ((handoff_type = ANY (ARRAY['relay_to_transporter'::text, 'transporter_to_relay'::text, 'transporter_to_destination'::text]))),
    CONSTRAINT shipment_handoffs_to_type_check CHECK ((to_type = ANY (ARRAY['relay'::text, 'transporter'::text])))
);


--
-- Name: shipment_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.shipment_statistics AS
 SELECT date(shipments.created_at) AS date,
    shipments.current_status,
    count(*) AS count,
    sum(shipments.price) AS total_revenue,
    avg(shipments.price) AS avg_price
   FROM public.shipments
  GROUP BY (date(shipments.created_at)), shipments.current_status;


--
-- Name: shipment_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_status_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid,
    status text NOT NULL,
    previous_status text,
    location text,
    notes text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shipment_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_tracking (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid,
    status text NOT NULL,
    location text,
    notes text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_type public.support_message_sender NOT NULL,
    sender_id uuid,
    channel public.support_channel,
    body text,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_id uuid NOT NULL,
    author_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_reminders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_id uuid NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    status public.support_reminder_status DEFAULT 'pending'::public.support_reminder_status NOT NULL,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_ticket_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    subject text,
    summary text,
    customer_name text,
    customer_email text,
    customer_phone text,
    customer_id uuid,
    channel public.support_channel DEFAULT 'contact_form'::public.support_channel NOT NULL,
    status public.support_ticket_status DEFAULT 'open'::public.support_ticket_status NOT NULL,
    priority public.support_ticket_priority DEFAULT 'normal'::public.support_ticket_priority NOT NULL,
    topic text,
    tracking_number text,
    shipment_id uuid,
    assigned_agent_id uuid,
    created_by uuid,
    last_message_at timestamp with time zone DEFAULT now(),
    last_message_from public.support_message_sender DEFAULT 'customer'::public.support_message_sender,
    first_agent_reply_at timestamp with time zone,
    is_urgent boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    transporter_id uuid,
    relay_point_id uuid,
    escalated_to_admin boolean DEFAULT false
);


--
-- Name: tracking_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracking_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shipment_id uuid NOT NULL,
    tracking_number character varying(30) NOT NULL,
    status character varying(50) NOT NULL,
    location_id character varying(100),
    scanner_id character varying(100),
    scanner_type character varying(50),
    notes text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE tracking_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tracking_events IS 'Stores all scan events and tracking history for shipments';


--
-- Name: COLUMN tracking_events.tracking_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tracking_events.tracking_number IS 'Tracking number for quick lookup without join';


--
-- Name: COLUMN tracking_events.location_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tracking_events.location_id IS 'Location identifier (HUB-PARIS01, RELAIS-203, etc.)';


--
-- Name: COLUMN tracking_events.scanner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tracking_events.scanner_id IS 'ID of the user or device that performed the scan';


--
-- Name: COLUMN tracking_events.scanner_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tracking_events.scanner_type IS 'Type of scanner: relay, transporter, hub, mobile_app';


--
-- Name: COLUMN tracking_events."timestamp"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tracking_events."timestamp" IS 'Actual time when the scan occurred (supports offline sync)';


--
-- Name: transporter_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transporter_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    transporter_id uuid NOT NULL,
    shipment_id uuid NOT NULL,
    relay_point_id uuid,
    assignment_status text DEFAULT 'pending'::text NOT NULL,
    expected_pickup_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT transporter_assignments_assignment_status_check CHECK ((assignment_status = ANY (ARRAY['pending'::text, 'in_transit'::text, 'delivered'::text])))
);


--
-- Name: TABLE transporter_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transporter_assignments IS 'Tracks which shipments are assigned to which transporters';


--
-- Name: COLUMN transporter_assignments.assignment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transporter_assignments.assignment_status IS 'Status: pending, picked_up, delivered';


--
-- Name: transporter_delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transporter_delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transporter_id uuid NOT NULL,
    zone_id uuid NOT NULL,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE transporter_delivery_zones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transporter_delivery_zones IS 'Junction table linking transporters to their delivery zones';


--
-- Name: COLUMN transporter_delivery_zones.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transporter_delivery_zones.priority IS 'Priority level: lower number = higher priority when assigning shipments';


--
-- Name: transporters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transporters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    vehicle_type text NOT NULL,
    license_plate text,
    status text DEFAULT 'available'::text,
    current_packages integer DEFAULT 0,
    total_deliveries integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    transporter_code character varying(6)
);


--
-- Name: user_shipping_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_shipping_addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    address text NOT NULL,
    complement_adresse text,
    ville text,
    commune text NOT NULL,
    quartier text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_shipping_addresses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_shipping_addresses IS 'Stores multiple shipping addresses for each user';


--
-- Name: COLUMN user_shipping_addresses.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_shipping_addresses.user_id IS 'Owner of this shipping address';


--
-- Name: COLUMN user_shipping_addresses.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_shipping_addresses.address IS 'Street address';


--
-- Name: COLUMN user_shipping_addresses.complement_adresse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_shipping_addresses.complement_adresse IS 'Address complement (apartment, building, etc.)';


--
-- Name: COLUMN user_shipping_addresses.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_shipping_addresses.is_default IS 'Whether this is the default shipping address';


--
-- Name: additional_pricing_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_pricing_options ALTER COLUMN id SET DEFAULT nextval('public.additional_pricing_options_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: pricing_grids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_grids ALTER COLUMN id SET DEFAULT nextval('public.pricing_grids_id_seq'::regclass);


--
-- Name: pricing_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_settings ALTER COLUMN id SET DEFAULT nextval('public.pricing_settings_id_seq'::regclass);


--
-- Name: additional_pricing_options additional_pricing_options_option_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_pricing_options
    ADD CONSTRAINT additional_pricing_options_option_key_key UNIQUE (option_key);


--
-- Name: additional_pricing_options additional_pricing_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.additional_pricing_options
    ADD CONSTRAINT additional_pricing_options_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (key);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_usage_logs api_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: api_webhook_deliveries api_webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_webhook_deliveries
    ADD CONSTRAINT api_webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: api_webhooks api_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_webhooks
    ADD CONSTRAINT api_webhooks_pkey PRIMARY KEY (id);


--
-- Name: automated_payments automated_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automated_payments
    ADD CONSTRAINT automated_payments_pkey PRIMARY KEY (id);


--
-- Name: customer_messages customer_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_filename_key UNIQUE (filename);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: mobile_money_payments mobile_money_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_payments
    ADD CONSTRAINT mobile_money_payments_pkey PRIMARY KEY (id);


--
-- Name: mobile_money_payments mobile_money_payments_shipment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_payments
    ADD CONSTRAINT mobile_money_payments_shipment_id_key UNIQUE (shipment_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pricing_grids pricing_grids_grid_type_package_size_delivery_mode_weight_min_w; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_grids
    ADD CONSTRAINT pricing_grids_grid_type_package_size_delivery_mode_weight_min_w UNIQUE (grid_type, package_size, delivery_mode, weight_min, weight_max);


--
-- Name: pricing_grids pricing_grids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_grids
    ADD CONSTRAINT pricing_grids_pkey PRIMARY KEY (id);


--
-- Name: pricing_settings pricing_settings_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_settings
    ADD CONSTRAINT pricing_settings_name_key UNIQUE (name);


--
-- Name: pricing_settings pricing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_settings
    ADD CONSTRAINT pricing_settings_pkey PRIMARY KEY (id);


--
-- Name: pro_address_book pro_address_book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_address_book
    ADD CONSTRAINT pro_address_book_pkey PRIMARY KEY (id);


--
-- Name: pro_business_profiles pro_business_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_business_profiles
    ADD CONSTRAINT pro_business_profiles_pkey PRIMARY KEY (id);


--
-- Name: pro_business_profiles pro_business_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_business_profiles
    ADD CONSTRAINT pro_business_profiles_user_id_key UNIQUE (user_id);


--
-- Name: recipient_addresses recipient_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipient_addresses
    ADD CONSTRAINT recipient_addresses_pkey PRIMARY KEY (id);


--
-- Name: recipient_addresses recipient_addresses_user_id_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipient_addresses
    ADD CONSTRAINT recipient_addresses_user_id_label_key UNIQUE (user_id, label);


--
-- Name: relay_cash_payments relay_cash_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_cash_payments
    ADD CONSTRAINT relay_cash_payments_pkey PRIMARY KEY (id);


--
-- Name: relay_cash_payments relay_cash_payments_shipment_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_cash_payments
    ADD CONSTRAINT relay_cash_payments_shipment_unique UNIQUE (shipment_id);


--
-- Name: relay_partners relay_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_partners
    ADD CONSTRAINT relay_partners_pkey PRIMARY KEY (id);


--
-- Name: relay_partners relay_partners_user_id_relay_point_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_partners
    ADD CONSTRAINT relay_partners_user_id_relay_point_id_key UNIQUE (user_id, relay_point_id);


--
-- Name: relay_point_applications relay_point_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_applications
    ADD CONSTRAINT relay_point_applications_pkey PRIMARY KEY (id);


--
-- Name: relay_point_daily_metrics relay_point_daily_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_daily_metrics
    ADD CONSTRAINT relay_point_daily_metrics_pkey PRIMARY KEY (relay_point_id, metric_date);


--
-- Name: relay_point_metrics relay_point_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_metrics
    ADD CONSTRAINT relay_point_metrics_pkey PRIMARY KEY (relay_point_id);


--
-- Name: relay_points relay_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_points
    ADD CONSTRAINT relay_points_pkey PRIMARY KEY (id);


--
-- Name: relay_points relay_points_relay_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_points
    ADD CONSTRAINT relay_points_relay_code_key UNIQUE (relay_code);


--
-- Name: sender_addresses sender_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sender_addresses
    ADD CONSTRAINT sender_addresses_pkey PRIMARY KEY (id);


--
-- Name: sender_addresses sender_addresses_user_id_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sender_addresses
    ADD CONSTRAINT sender_addresses_user_id_label_key UNIQUE (user_id, label);


--
-- Name: shipment_handoffs shipment_handoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_handoffs
    ADD CONSTRAINT shipment_handoffs_pkey PRIMARY KEY (id);


--
-- Name: shipment_status_history shipment_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_status_history
    ADD CONSTRAINT shipment_status_history_pkey PRIMARY KEY (id);


--
-- Name: shipment_tracking shipment_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pickup_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pickup_code_unique UNIQUE (pickup_code);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_tracking_number_key UNIQUE (tracking_number);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_notes support_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_notes
    ADD CONSTRAINT support_notes_pkey PRIMARY KEY (id);


--
-- Name: support_reminders support_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_reminders
    ADD CONSTRAINT support_reminders_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_events support_ticket_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_events
    ADD CONSTRAINT support_ticket_events_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: tracking_events tracking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_events
    ADD CONSTRAINT tracking_events_pkey PRIMARY KEY (id);


--
-- Name: transporter_assignments transporter_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_assignments
    ADD CONSTRAINT transporter_assignments_pkey PRIMARY KEY (id);


--
-- Name: transporter_assignments transporter_assignments_transporter_id_shipment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_assignments
    ADD CONSTRAINT transporter_assignments_transporter_id_shipment_id_key UNIQUE (transporter_id, shipment_id);


--
-- Name: transporter_delivery_zones transporter_delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_delivery_zones
    ADD CONSTRAINT transporter_delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: transporter_delivery_zones transporter_delivery_zones_transporter_id_zone_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_delivery_zones
    ADD CONSTRAINT transporter_delivery_zones_transporter_id_zone_id_key UNIQUE (transporter_id, zone_id);


--
-- Name: transporters transporters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_pkey PRIMARY KEY (id);


--
-- Name: transporters transporters_transporter_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_transporter_code_key UNIQUE (transporter_code);


--
-- Name: transporters transporters_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_user_id_key UNIQUE (user_id);


--
-- Name: user_shipping_addresses user_shipping_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shipping_addresses
    ADD CONSTRAINT user_shipping_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_additional_options_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_additional_options_active ON public.additional_pricing_options USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_usage_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_created ON public.api_usage_logs USING btree (created_at DESC);


--
-- Name: idx_api_usage_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_usage_key ON public.api_usage_logs USING btree (api_key_id, created_at DESC);


--
-- Name: idx_api_webhooks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_webhooks_active ON public.api_webhooks USING btree (is_active);


--
-- Name: idx_api_webhooks_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_webhooks_key ON public.api_webhooks USING btree (api_key_id);


--
-- Name: idx_automated_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automated_payments_status ON public.automated_payments USING btree (status);


--
-- Name: idx_automated_payments_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automated_payments_tracking ON public.automated_payments USING btree (tracking_number);


--
-- Name: idx_automated_payments_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automated_payments_transaction ON public.automated_payments USING btree (transaction_id);


--
-- Name: idx_customer_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_created_at ON public.customer_messages USING btree (created_at DESC);


--
-- Name: idx_customer_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_status ON public.customer_messages USING btree (status);


--
-- Name: idx_customer_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_user_id ON public.customer_messages USING btree (user_id);


--
-- Name: idx_customer_messages_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_user_unread ON public.customer_messages USING btree (user_id, unread);


--
-- Name: idx_delivery_zones_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zones_active ON public.delivery_zones USING btree (is_active);


--
-- Name: idx_delivery_zones_communes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zones_communes ON public.delivery_zones USING gin (communes);


--
-- Name: idx_job_applications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_created_at ON public.job_applications USING btree (created_at DESC);


--
-- Name: idx_job_applications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_email ON public.job_applications USING btree (email);


--
-- Name: idx_job_applications_job_posting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_job_posting_id ON public.job_applications USING btree (job_posting_id);


--
-- Name: idx_job_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_status ON public.job_applications USING btree (status);


--
-- Name: idx_job_postings_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_department ON public.job_postings USING btree (department);


--
-- Name: idx_job_postings_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_is_active ON public.job_postings USING btree (is_active);


--
-- Name: idx_job_postings_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_is_featured ON public.job_postings USING btree (is_featured);


--
-- Name: idx_job_postings_posted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_posted_at ON public.job_postings USING btree (posted_at DESC);


--
-- Name: idx_mobile_money_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_payments_created_at ON public.mobile_money_payments USING btree (created_at);


--
-- Name: idx_mobile_money_payments_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_payments_provider ON public.mobile_money_payments USING btree (provider);


--
-- Name: idx_mobile_money_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mobile_money_payments_status ON public.mobile_money_payments USING btree (status);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_pricing_grids_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_grids_active ON public.pricing_grids USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_pricing_grids_delivery_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_grids_delivery_mode ON public.pricing_grids USING btree (delivery_mode);


--
-- Name: idx_pricing_grids_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_grids_type ON public.pricing_grids USING btree (grid_type, package_size);


--
-- Name: idx_pricing_settings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_settings_active ON public.pricing_settings USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_pro_address_book_is_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pro_address_book_is_favorite ON public.pro_address_book USING btree (is_favorite);


--
-- Name: idx_pro_address_book_recipient_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pro_address_book_recipient_phone ON public.pro_address_book USING btree (recipient_phone);


--
-- Name: idx_pro_address_book_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pro_address_book_user_id ON public.pro_address_book USING btree (user_id);


--
-- Name: idx_pro_business_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pro_business_profiles_user_id ON public.pro_business_profiles USING btree (user_id);


--
-- Name: idx_recipient_addresses_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipient_addresses_is_default ON public.recipient_addresses USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_recipient_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipient_addresses_user_id ON public.recipient_addresses USING btree (user_id);


--
-- Name: idx_relay_applications_commune; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_applications_commune ON public.relay_point_applications USING btree (commune);


--
-- Name: idx_relay_applications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_applications_created_at ON public.relay_point_applications USING btree (created_at DESC);


--
-- Name: idx_relay_applications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_applications_email ON public.relay_point_applications USING btree (email);


--
-- Name: idx_relay_applications_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_applications_phone ON public.relay_point_applications USING btree (phone);


--
-- Name: idx_relay_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_applications_status ON public.relay_point_applications USING btree (status);


--
-- Name: idx_relay_cash_payments_collected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_cash_payments_collected_at ON public.relay_cash_payments USING btree (collected_at);


--
-- Name: idx_relay_cash_payments_collection_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_cash_payments_collection_location ON public.relay_cash_payments USING btree (collection_location);


--
-- Name: idx_relay_cash_payments_relay_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_cash_payments_relay_id ON public.relay_cash_payments USING btree (relay_point_id);


--
-- Name: idx_relay_cash_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_cash_payments_status ON public.relay_cash_payments USING btree (status);


--
-- Name: idx_relay_partners_relay_point_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_partners_relay_point_id ON public.relay_partners USING btree (relay_point_id);


--
-- Name: idx_relay_partners_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_partners_user_id ON public.relay_partners USING btree (user_id);


--
-- Name: idx_relay_points_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_points_code ON public.relay_points USING btree (relay_code);


--
-- Name: idx_relay_points_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_points_created_by ON public.relay_points USING btree (created_by);


--
-- Name: idx_relay_points_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_points_updated_by ON public.relay_points USING btree (updated_by);


--
-- Name: idx_relay_points_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relay_points_zone_id ON public.relay_points USING btree (zone_id);


--
-- Name: idx_sender_addresses_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sender_addresses_is_default ON public.sender_addresses USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_sender_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sender_addresses_user_id ON public.sender_addresses USING btree (user_id);


--
-- Name: idx_shipment_handoffs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_handoffs_created_at ON public.shipment_handoffs USING btree (created_at DESC);


--
-- Name: idx_shipment_handoffs_shipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_handoffs_shipment_id ON public.shipment_handoffs USING btree (shipment_id);


--
-- Name: idx_shipment_status_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_status_history_created_at ON public.shipment_status_history USING btree (created_at DESC);


--
-- Name: idx_shipment_status_history_shipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_status_history_shipment_id ON public.shipment_status_history USING btree (shipment_id);


--
-- Name: idx_shipment_tracking_shipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipment_tracking_shipment_id ON public.shipment_tracking USING btree (shipment_id);


--
-- Name: idx_shipments_current_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_current_status ON public.shipments USING btree (current_status);


--
-- Name: idx_shipments_current_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_current_status_created ON public.shipments USING btree (current_status, created_at);


--
-- Name: idx_shipments_destination_relay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_destination_relay ON public.shipments USING btree (destination_relay_id);


--
-- Name: idx_shipments_origin_relay; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_origin_relay ON public.shipments USING btree (origin_relay_id);


--
-- Name: idx_shipments_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_payment_status ON public.shipments USING btree (payment_status);


--
-- Name: idx_shipments_pickup_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_pickup_code ON public.shipments USING btree (pickup_code);


--
-- Name: idx_shipments_pickup_code_verified_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_pickup_code_verified_at ON public.shipments USING btree (pickup_code_verified_at);


--
-- Name: idx_shipments_shipment_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_shipment_code ON public.shipments USING btree (shipment_code);


--
-- Name: idx_shipments_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_tracking_number ON public.shipments USING btree (tracking_number);


--
-- Name: idx_support_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_created ON public.support_messages USING btree (created_at);


--
-- Name: idx_support_messages_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_ticket ON public.support_messages USING btree (ticket_id);


--
-- Name: idx_support_notes_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_notes_ticket ON public.support_notes USING btree (ticket_id);


--
-- Name: idx_support_reminders_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_reminders_schedule ON public.support_reminders USING btree (scheduled_for);


--
-- Name: idx_support_reminders_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_reminders_ticket ON public.support_reminders USING btree (ticket_id);


--
-- Name: idx_support_ticket_events_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_events_ticket ON public.support_ticket_events USING btree (ticket_id);


--
-- Name: idx_support_ticket_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_events_type ON public.support_ticket_events USING btree (event_type);


--
-- Name: idx_support_tickets_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_assigned ON public.support_tickets USING btree (assigned_agent_id);


--
-- Name: idx_support_tickets_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_channel ON public.support_tickets USING btree (channel);


--
-- Name: idx_support_tickets_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_last_message ON public.support_tickets USING btree (last_message_at DESC);


--
-- Name: idx_support_tickets_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);


--
-- Name: idx_support_tickets_relay_point; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_relay_point ON public.support_tickets USING btree (relay_point_id);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_tracking ON public.support_tickets USING btree (tracking_number);


--
-- Name: idx_support_tickets_transporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_transporter ON public.support_tickets USING btree (transporter_id);


--
-- Name: idx_tracking_events_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_location_id ON public.tracking_events USING btree (location_id);


--
-- Name: idx_tracking_events_shipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_shipment ON public.tracking_events USING btree (shipment_id);


--
-- Name: idx_tracking_events_shipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_shipment_id ON public.tracking_events USING btree (shipment_id);


--
-- Name: idx_tracking_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_status ON public.tracking_events USING btree (status);


--
-- Name: idx_tracking_events_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_timestamp ON public.tracking_events USING btree ("timestamp" DESC);


--
-- Name: idx_tracking_events_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_tracking ON public.tracking_events USING btree (tracking_number);


--
-- Name: idx_tracking_events_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_tracking_number ON public.tracking_events USING btree (tracking_number);


--
-- Name: idx_transporter_assignments_shipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporter_assignments_shipment ON public.transporter_assignments USING btree (shipment_id);


--
-- Name: idx_transporter_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporter_assignments_status ON public.transporter_assignments USING btree (assignment_status);


--
-- Name: idx_transporter_assignments_transporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporter_assignments_transporter ON public.transporter_assignments USING btree (transporter_id);


--
-- Name: idx_transporter_delivery_zones_transporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporter_delivery_zones_transporter ON public.transporter_delivery_zones USING btree (transporter_id);


--
-- Name: idx_transporter_delivery_zones_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporter_delivery_zones_zone ON public.transporter_delivery_zones USING btree (zone_id);


--
-- Name: idx_transporters_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporters_code ON public.transporters USING btree (transporter_code);


--
-- Name: idx_transporters_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transporters_user_id ON public.transporters USING btree (user_id);


--
-- Name: idx_user_shipping_addresses_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_shipping_addresses_is_default ON public.user_shipping_addresses USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_user_shipping_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_shipping_addresses_user_id ON public.user_shipping_addresses USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_phone ON public.users USING btree (email, phone);


--
-- Name: INDEX idx_users_email_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_email_phone IS 'Composite index for email and phone authentication lookups';


--
-- Name: idx_users_is_pro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_pro ON public.users USING btree (is_pro);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: INDEX idx_users_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_users_phone IS 'Index for phone-based login queries';


--
-- Name: idx_users_phone_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_phone_unique ON public.users USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_webhook_deliveries_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_created ON public.api_webhook_deliveries USING btree (created_at DESC);


--
-- Name: idx_webhook_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_status ON public.api_webhook_deliveries USING btree (status, next_retry_at);


--
-- Name: idx_webhook_deliveries_webhook; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_webhook ON public.api_webhook_deliveries USING btree (webhook_id);


--
-- Name: additional_pricing_options additional_pricing_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER additional_pricing_options_updated_at BEFORE UPDATE ON public.additional_pricing_options FOR EACH ROW EXECUTE FUNCTION public.update_additional_options_updated_at();


--
-- Name: user_shipping_addresses ensure_single_default_address_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_default_address_trigger BEFORE INSERT OR UPDATE ON public.user_shipping_addresses FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION public.ensure_single_default_address();


--
-- Name: pricing_grids pricing_grids_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pricing_grids_updated_at BEFORE UPDATE ON public.pricing_grids FOR EACH ROW EXECUTE FUNCTION public.update_pricing_grids_updated_at();


--
-- Name: pricing_settings pricing_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pricing_settings_updated_at BEFORE UPDATE ON public.pricing_settings FOR EACH ROW EXECUTE FUNCTION public.update_pricing_settings_updated_at();


--
-- Name: shipments shipment_status_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shipment_status_change_trigger AFTER UPDATE OF current_status ON public.shipments FOR EACH ROW WHEN ((old.current_status IS DISTINCT FROM new.current_status)) EXECUTE FUNCTION public.log_shipment_state_change();


--
-- Name: admin_settings trg_admin_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_admin_settings_updated_at();


--
-- Name: mobile_money_payments trg_set_updated_at_mobile_money_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_mobile_money_payments BEFORE UPDATE ON public.mobile_money_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_mobile_money_payments();


--
-- Name: relay_cash_payments trg_set_updated_at_relay_cash_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_relay_cash_payments BEFORE UPDATE ON public.relay_cash_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_relay_cash_payments();


--
-- Name: support_messages trg_support_messages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_support_messages_updated BEFORE UPDATE ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.set_support_updated_at();


--
-- Name: support_notes trg_support_notes_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_support_notes_updated BEFORE UPDATE ON public.support_notes FOR EACH ROW EXECUTE FUNCTION public.set_support_updated_at();


--
-- Name: support_reminders trg_support_reminders_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_support_reminders_updated BEFORE UPDATE ON public.support_reminders FOR EACH ROW EXECUTE FUNCTION public.set_support_updated_at();


--
-- Name: support_tickets trg_support_tickets_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_support_updated_at();


--
-- Name: delivery_zones trigger_delivery_zone_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_delivery_zone_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_delivery_zone_updated_at();


--
-- Name: recipient_addresses trigger_ensure_single_default_recipient; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_single_default_recipient BEFORE INSERT OR UPDATE ON public.recipient_addresses FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_recipient_address();


--
-- Name: sender_addresses trigger_ensure_single_default_sender; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_single_default_sender BEFORE INSERT OR UPDATE ON public.sender_addresses FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_sender_address();


--
-- Name: relay_point_applications trigger_relay_application_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_relay_application_updated_at BEFORE UPDATE ON public.relay_point_applications FOR EACH ROW EXECUTE FUNCTION public.update_relay_application_updated_at();


--
-- Name: relay_points trigger_set_relay_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_relay_code BEFORE INSERT ON public.relay_points FOR EACH ROW EXECUTE FUNCTION public.set_relay_code();


--
-- Name: transporters trigger_set_transporter_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_transporter_code BEFORE INSERT ON public.transporters FOR EACH ROW EXECUTE FUNCTION public.set_transporter_code();


--
-- Name: transporter_delivery_zones trigger_transporter_delivery_zone_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_transporter_delivery_zone_updated_at BEFORE UPDATE ON public.transporter_delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_transporter_delivery_zone_updated_at();


--
-- Name: pro_address_book trigger_update_pro_address_book_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_pro_address_book_updated_at BEFORE UPDATE ON public.pro_address_book FOR EACH ROW EXECUTE FUNCTION public.update_pro_address_book_updated_at();


--
-- Name: api_keys update_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_webhooks update_api_webhooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_webhooks_updated_at BEFORE UPDATE ON public.api_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_messages update_customer_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_messages_updated_at BEFORE UPDATE ON public.customer_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_applications update_job_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_job_applications_updated_at();


--
-- Name: job_postings update_job_postings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.update_job_postings_updated_at();


--
-- Name: recipient_addresses update_recipient_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recipient_addresses_updated_at BEFORE UPDATE ON public.recipient_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sender_addresses update_sender_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sender_addresses_updated_at BEFORE UPDATE ON public.sender_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transporter_assignments update_transporter_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transporter_assignments_updated_at BEFORE UPDATE ON public.transporter_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_shipping_addresses update_user_shipping_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_shipping_addresses_updated_at BEFORE UPDATE ON public.user_shipping_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_usage_logs api_usage_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL;


--
-- Name: api_webhook_deliveries api_webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_webhook_deliveries
    ADD CONSTRAINT api_webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.api_webhooks(id) ON DELETE CASCADE;


--
-- Name: api_webhooks api_webhooks_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_webhooks
    ADD CONSTRAINT api_webhooks_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: automated_payments automated_payments_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automated_payments
    ADD CONSTRAINT automated_payments_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_support_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_support_ticket_id_fkey FOREIGN KEY (support_ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;


--
-- Name: customer_messages customer_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: delivery_zones delivery_zones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users fk_users_relay_point; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_relay_point FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: job_applications job_applications_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: job_postings job_postings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: mobile_money_payments mobile_money_payments_declared_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_payments
    ADD CONSTRAINT mobile_money_payments_declared_by_user_id_fkey FOREIGN KEY (declared_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: mobile_money_payments mobile_money_payments_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_payments
    ADD CONSTRAINT mobile_money_payments_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: mobile_money_payments mobile_money_payments_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_money_payments
    ADD CONSTRAINT mobile_money_payments_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pro_address_book pro_address_book_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_address_book
    ADD CONSTRAINT pro_address_book_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pro_business_profiles pro_business_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pro_business_profiles
    ADD CONSTRAINT pro_business_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recipient_addresses recipient_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipient_addresses
    ADD CONSTRAINT recipient_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: relay_cash_payments relay_cash_payments_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_cash_payments
    ADD CONSTRAINT relay_cash_payments_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: relay_cash_payments relay_cash_payments_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_cash_payments
    ADD CONSTRAINT relay_cash_payments_relay_point_id_fkey FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: relay_cash_payments relay_cash_payments_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_cash_payments
    ADD CONSTRAINT relay_cash_payments_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: relay_partners relay_partners_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_partners
    ADD CONSTRAINT relay_partners_relay_point_id_fkey FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE CASCADE;


--
-- Name: relay_partners relay_partners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_partners
    ADD CONSTRAINT relay_partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: relay_point_applications relay_point_applications_approved_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_applications
    ADD CONSTRAINT relay_point_applications_approved_relay_point_id_fkey FOREIGN KEY (approved_relay_point_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: relay_point_applications relay_point_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_applications
    ADD CONSTRAINT relay_point_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: relay_point_daily_metrics relay_point_daily_metrics_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_daily_metrics
    ADD CONSTRAINT relay_point_daily_metrics_relay_point_id_fkey FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE CASCADE;


--
-- Name: relay_point_metrics relay_point_metrics_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_point_metrics
    ADD CONSTRAINT relay_point_metrics_relay_point_id_fkey FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE CASCADE;


--
-- Name: relay_points relay_points_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_points
    ADD CONSTRAINT relay_points_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.relay_point_applications(id) ON DELETE SET NULL;


--
-- Name: relay_points relay_points_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_points
    ADD CONSTRAINT relay_points_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: relay_points relay_points_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_points
    ADD CONSTRAINT relay_points_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: relay_points relay_points_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relay_points
    ADD CONSTRAINT relay_points_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;


--
-- Name: sender_addresses sender_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sender_addresses
    ADD CONSTRAINT sender_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shipment_handoffs shipment_handoffs_scanned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_handoffs
    ADD CONSTRAINT shipment_handoffs_scanned_by_user_id_fkey FOREIGN KEY (scanned_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipment_handoffs shipment_handoffs_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_handoffs
    ADD CONSTRAINT shipment_handoffs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_status_history shipment_status_history_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_status_history
    ADD CONSTRAINT shipment_status_history_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_status_history shipment_status_history_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_status_history
    ADD CONSTRAINT shipment_status_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipment_tracking shipment_tracking_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_tracking shipment_tracking_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_destination_relay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_destination_relay_id_fkey FOREIGN KEY (destination_relay_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_origin_relay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_origin_relay_id_fkey FOREIGN KEY (origin_relay_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_pickup_code_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pickup_code_verified_by_fkey FOREIGN KEY (pickup_code_verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_messages support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_notes support_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_notes
    ADD CONSTRAINT support_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_notes support_notes_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_notes
    ADD CONSTRAINT support_notes_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_reminders support_reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_reminders
    ADD CONSTRAINT support_reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_reminders support_reminders_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_reminders
    ADD CONSTRAINT support_reminders_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_ticket_events support_ticket_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_events
    ADD CONSTRAINT support_ticket_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_ticket_events support_ticket_events_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_events
    ADD CONSTRAINT support_ticket_events_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_assigned_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_relay_point_id_fkey FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id) ON DELETE SET NULL;


--
-- Name: tracking_events tracking_events_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_events
    ADD CONSTRAINT tracking_events_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: tracking_events tracking_events_shipment_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_events
    ADD CONSTRAINT tracking_events_shipment_id_fkey1 FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: transporter_assignments transporter_assignments_relay_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_assignments
    ADD CONSTRAINT transporter_assignments_relay_point_id_fkey FOREIGN KEY (relay_point_id) REFERENCES public.relay_points(id) ON DELETE SET NULL;


--
-- Name: transporter_assignments transporter_assignments_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_assignments
    ADD CONSTRAINT transporter_assignments_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: transporter_assignments transporter_assignments_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_assignments
    ADD CONSTRAINT transporter_assignments_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id) ON DELETE CASCADE;


--
-- Name: transporter_delivery_zones transporter_delivery_zones_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_delivery_zones
    ADD CONSTRAINT transporter_delivery_zones_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id) ON DELETE CASCADE;


--
-- Name: transporter_delivery_zones transporter_delivery_zones_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporter_delivery_zones
    ADD CONSTRAINT transporter_delivery_zones_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.delivery_zones(id) ON DELETE CASCADE;


--
-- Name: transporters transporters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_shipping_addresses user_shipping_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shipping_addresses
    ADD CONSTRAINT user_shipping_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict zAXJtNtmr5ygaxPplS50wDFoO78bpabkcWn6DWU1XtYzbogCzBmm46a4OsrnFZs

