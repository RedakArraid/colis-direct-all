-- Add 'paystack' as valid payment_method on shipments (distinct from manual mobile_money)
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_payment_method_check;
ALTER TABLE shipments ADD CONSTRAINT shipments_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY (
    ARRAY['mobile_money', 'relay_cash', 'card', 'paystack']
  ));
