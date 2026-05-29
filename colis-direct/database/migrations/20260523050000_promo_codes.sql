CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT          NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT          NOT NULL CHECK (discount_type IN ('free', 'fixed', 'percentage')),
  discount_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses        INTEGER,
  uses_count      INTEGER       NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes (code) WHERE is_active = TRUE;

-- Migrate hardcoded DKMASSI promo to DB
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, is_active)
VALUES ('DKMASSI', 'Code promotionnel fondateurs', 'free', 0, true)
ON CONFLICT (code) DO NOTHING;
