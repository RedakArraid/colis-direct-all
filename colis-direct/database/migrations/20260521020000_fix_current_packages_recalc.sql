-- Fix transporter current_packages counter (corrective recalculation)
-- The previous trigger (20260520110000) only fires on shipments.current_status UPDATE.
-- But some assignments go through transporter_assignments without updating shipments.transporter_id.
-- This migration:
--   1. Recreates the trigger robustly (handles both transporter_id paths)
--   2. Forces a full recalculation of current_packages from active assignments

-- ─────────────────────────────────────────────────────────────
-- Step 1: Recreate the decrement function
-- Count active packages = those in transporter_assignments that are NOT terminal
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_transporter_packages()
RETURNS TRIGGER AS $$
DECLARE
  v_transporter_id uuid;
BEGIN
  -- Determine the transporter: prefer transporter_id on shipment, fallback to assignment
  v_transporter_id := NEW.transporter_id;

  IF v_transporter_id IS NULL THEN
    SELECT ta.transporter_id INTO v_transporter_id
    FROM transporter_assignments ta
    WHERE ta.shipment_id = NEW.id
    LIMIT 1;
  END IF;

  IF v_transporter_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On transition TO terminal status FROM non-terminal status → decrement
  IF NEW.current_status IN (
      'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
      'CANCELLED', 'RETURN_TO_SENDER'
    )
    AND (
      OLD.current_status IS NULL
      OR OLD.current_status NOT IN (
        'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
        'CANCELLED', 'RETURN_TO_SENDER'
      )
    )
  THEN
    UPDATE transporters
    SET current_packages = GREATEST(0, current_packages - 1)
    WHERE id = v_transporter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_transporter_packages ON shipments;
CREATE TRIGGER trg_decrement_transporter_packages
  AFTER UPDATE OF current_status ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_transporter_packages();

-- ─────────────────────────────────────────────────────────────
-- Step 2: Full recalculation of current_packages for ALL transporters
-- Source of truth: transporter_assignments JOIN shipments (non-terminal)
-- ─────────────────────────────────────────────────────────────
UPDATE transporters t
SET current_packages = (
  SELECT COUNT(DISTINCT ta.shipment_id)
  FROM transporter_assignments ta
  JOIN shipments s ON s.id = ta.shipment_id
  WHERE (ta.transporter_id = t.id OR s.transporter_id = t.id)
    AND s.current_status NOT IN (
      'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
      'CANCELLED', 'RETURN_TO_SENDER'
    )
);
