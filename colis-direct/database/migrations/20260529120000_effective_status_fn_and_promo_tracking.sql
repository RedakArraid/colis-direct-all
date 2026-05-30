-- #4 — Fonction unique pour le statut effectif (élimine la duplication du CASE dans shipments.ts/relayPoints.ts)
-- Centralise la logique d'affichage : statut terminal prioritaire, puis états de paiement.
-- paystack/cinetpay sont normalisés en 'mobile_money' à la création, mais on garde les branches pour les anciens colis.
CREATE OR REPLACE FUNCTION shipment_effective_status(
  p_current_status text,
  p_payment_method text,
  p_payment_status text,
  p_mmp_status     text,
  p_rcp_status     text
) RETURNS text AS $$
  SELECT CASE
    WHEN p_current_status IN ('DELIVERED','DELIVERED_TO_CUSTOMER','PICKED_UP_BY_CUSTOMER','CANCELLED','RETURN_TO_SENDER')
      THEN p_current_status
    WHEN p_payment_method = 'relay_cash' THEN
      CASE WHEN COALESCE(p_rcp_status,'') = 'collected' OR p_payment_status = 'paid'
           THEN 'PAYMENT_RECEIVED_AT_RELAY'
           ELSE 'PAYMENT_PENDING_AT_RELAY' END
    WHEN p_payment_method = 'mobile_money' AND COALESCE(p_mmp_status,'') = 'rejected'
      THEN 'PAYMENT_REJECTED'
    WHEN p_payment_method IN ('mobile_money','paystack','cinetpay')
      AND p_payment_status = 'pending'
      AND (p_current_status IS NULL OR p_current_status = 'READY_FOR_DROP_OFF')
      THEN 'PAYMENT_AWAITING_VALIDATION'
    WHEN p_payment_method IN ('mobile_money','paystack','cinetpay')
      AND p_payment_status = 'paid'
      AND (p_current_status IS NULL OR p_current_status = 'READY_FOR_DROP_OFF')
      THEN 'PAYMENT_CONFIRMED_AWAITING_DROP'
    ELSE COALESCE(p_current_status, 'READY_FOR_DROP_OFF')
  END;
$$ LANGUAGE sql IMMUTABLE;

-- #2 — Persistance du code promo + comptage fiable de uses_count
-- Avant : uses_count n'était incrémenté qu'à la création des colis 100% gratuits.
-- Les paiements Paystack (création 'pending' → webhook 'paid') ne consommaient jamais le quota.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS promo_code   text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS promo_counted boolean NOT NULL DEFAULT false;

-- Trigger BEFORE : dès qu'un colis avec promo passe à 'paid' (à la création OU au webhook),
-- on incrémente uses_count une seule fois (idempotent via promo_counted).
CREATE OR REPLACE FUNCTION trg_count_promo_use() RETURNS trigger AS $$
BEGIN
  IF NEW.promo_code IS NOT NULL
     AND NEW.payment_status = 'paid'
     AND NOT COALESCE(NEW.promo_counted, false)
  THEN
    UPDATE promo_codes
       SET uses_count = uses_count + 1
     WHERE UPPER(code) = UPPER(NEW.promo_code)
       AND is_active = TRUE
       AND (max_uses IS NULL OR uses_count < max_uses);
    NEW.promo_counted := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_count_promo_use ON shipments;
CREATE TRIGGER trg_count_promo_use
  BEFORE INSERT OR UPDATE OF payment_status ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION trg_count_promo_use();
