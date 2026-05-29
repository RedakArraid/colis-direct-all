-- Fix: decrement transporters.current_packages when a shipment reaches a terminal state
-- Without this, current_packages only ever increases and assignment scoring is permanently broken.

CREATE OR REPLACE FUNCTION decrement_transporter_packages()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement only on transition TO a terminal status FROM a non-terminal status
  IF NEW.current_status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER')
     AND (OLD.current_status IS NULL OR OLD.current_status NOT IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER'))
     AND NEW.transporter_id IS NOT NULL
  THEN
    UPDATE transporters
    SET current_packages = GREATEST(0, current_packages - 1)
    WHERE id = NEW.transporter_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_transporter_packages ON shipments;
CREATE TRIGGER trg_decrement_transporter_packages
  AFTER UPDATE OF current_status ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_transporter_packages();

-- Recalculate current_packages from active transporter_assignments for all transporters
UPDATE transporters t
SET current_packages = (
  SELECT COUNT(*)
  FROM transporter_assignments ta
  JOIN shipments s ON s.id = ta.shipment_id
  WHERE ta.transporter_id = t.id
    AND s.current_status NOT IN (
      'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
      'CANCELLED', 'RETURN_TO_SENDER'
    )
);
