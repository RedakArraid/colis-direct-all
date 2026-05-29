-- Reset E2E test account passwords to 'admin123'
-- Hash generated with bcrypt cost factor 10
-- All E2E accounts (e2e+*@colisdirect.test) get the same password for ease of testing.

DO $$
DECLARE
  admin123_hash TEXT := '$2a$10$HhweSNrQvYaaUnAOEs0dt.pHP8Lm1nQ/i6PPEx89VC1H7GVbggKT6';
BEGIN
  UPDATE users
  SET password_hash = admin123_hash,
      updated_at    = NOW()
  WHERE email IN (
    'e2e+client@colisdirect.test',
    'e2e+admin@colisdirect.test',
    'e2e+relay@colisdirect.test',
    'e2e+transporter@colisdirect.test',
    'e2e+support@colisdirect.test'
  );

  RAISE NOTICE 'Updated % E2E account passwords to admin123', (
    SELECT COUNT(*) FROM users
    WHERE email IN (
      'e2e+client@colisdirect.test',
      'e2e+admin@colisdirect.test',
      'e2e+relay@colisdirect.test',
      'e2e+transporter@colisdirect.test',
      'e2e+support@colisdirect.test'
    )
  );
END $$;
