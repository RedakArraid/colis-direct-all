-- Ensure PICKUP_PENDING exists in shipment_status enum before the index
-- migration that references it. Idempotent: no-op if already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PICKUP_PENDING'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shipment_status')
  ) THEN
    ALTER TYPE shipment_status ADD VALUE 'PICKUP_PENDING';
  END IF;
END;
$$;
