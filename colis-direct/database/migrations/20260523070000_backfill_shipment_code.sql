-- Backfill shipment_code for existing shipments that have NULL
-- (rows created before the column was reliably populated at insertion time)
UPDATE public.shipments
SET shipment_code = public.generate_shipment_code()
WHERE shipment_code IS NULL;
