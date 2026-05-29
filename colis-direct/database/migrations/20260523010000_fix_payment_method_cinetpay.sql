-- Add 'cinetpay' to shipments.payment_method allowed values.
-- Init schema had: mobile_money, relay_cash, card
-- Migration 20260520100000 added: paystack
-- This migration adds: cinetpay (CinetPay is a CI/SN payment gateway already wired in frontend)

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS shipments_payment_method_check;

ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_payment_method_check
    CHECK ((payment_method IS NULL) OR (payment_method = ANY (ARRAY[
      'mobile_money'::text,
      'relay_cash'::text,
      'card'::text,
      'paystack'::text,
      'cinetpay'::text
    ])));
