-- Fixtures E2E : point relais, profil transporteur, compte support (idempotent).
DO $$
DECLARE
  relay_user_id uuid;
  v_relay_point_id uuid := 'f8e2c4a1-9b3d-4e5f-a6c7-8d9e0f1a2b3c';
  transporter_user_id uuid;
  transporter_profile_id uuid;
  admin123_hash TEXT := '$2a$10$HhweSNrQvYaaUnAOEs0dt.pHP8Lm1nQ/i6PPEx89VC1H7GVbggKT6';
BEGIN
  INSERT INTO relay_points (id, name, type, commune, quartier, address, phone, is_active, status)
  VALUES (
    v_relay_point_id,
    'E2E Point Relais Test',
    'superette',
    'Cocody',
    'Riviera',
    'Rue E2E Test 1',
    '0700000001',
    true,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO relay_user_id FROM users WHERE email = 'e2e+relay@colisdirect.test';
  IF relay_user_id IS NOT NULL THEN
    UPDATE users SET relay_point_id = v_relay_point_id WHERE id = relay_user_id;
  END IF;

  INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
  VALUES ('e2e+support@colisdirect.test', admin123_hash, 'E2E', 'Support', '0700000005', 'support')
  ON CONFLICT (email) DO UPDATE
    SET role = 'support',
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

  SELECT id INTO transporter_user_id FROM users WHERE email = 'e2e+transporter@colisdirect.test';
  IF transporter_user_id IS NOT NULL THEN
    INSERT INTO transporters (user_id, vehicle_type, license_plate, status)
    VALUES (transporter_user_id, 'moto', 'E2E-001', 'available')
    ON CONFLICT (user_id) DO UPDATE
      SET vehicle_type = EXCLUDED.vehicle_type,
          status = 'available',
          updated_at = NOW()
    RETURNING id INTO transporter_profile_id;

    IF transporter_profile_id IS NULL THEN
      SELECT id INTO transporter_profile_id FROM transporters WHERE user_id = transporter_user_id;
    END IF;

    INSERT INTO transporter_wallets (transporter_id, balance_fcfa)
    SELECT transporter_profile_id, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM transporter_wallets WHERE transporter_id = transporter_profile_id
    );
  END IF;
END $$;
