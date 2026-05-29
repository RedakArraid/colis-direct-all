-- Composite partial indexes for relay active-shipments queries.
-- The new GET /api/relay-points/:id/active-shipments endpoint filters on
-- (origin_relay_id, current_status) OR (destination_relay_id, current_status).
-- Simple single-column indexes already exist; these composite partial indexes
-- cover only the rows that are actually active, keeping them small and fast.

CREATE INDEX IF NOT EXISTS idx_shipments_origin_relay_active
  ON public.shipments (origin_relay_id, current_status)
  WHERE origin_relay_id IS NOT NULL
    AND current_status = ANY (ARRAY[
      'RELAY_ORIGIN_RECEIVED'::shipment_status,
      'PICKUP_PENDING'::shipment_status,
      'PAYMENT_PENDING_AT_RELAY'::shipment_status,
      'PAYMENT_RECEIVED_AT_RELAY'::shipment_status,
      'PAYMENT_AWAITING_VALIDATION'::shipment_status,
      'PAYMENT_VALIDATED'::shipment_status
    ]);

CREATE INDEX IF NOT EXISTS idx_shipments_dest_relay_active
  ON public.shipments (destination_relay_id, current_status)
  WHERE destination_relay_id IS NOT NULL
    AND current_status = ANY (ARRAY[
      'RELAY_FINAL_RECEIVED'::shipment_status,
      'AVAILABLE_FOR_PICKUP'::shipment_status
    ]);
