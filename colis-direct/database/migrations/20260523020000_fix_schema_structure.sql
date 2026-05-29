-- Fix remaining schema structure issues:
-- 1. Add updated_at + auto-update trigger to transporters (was missing)
-- 2. Add status CHECK constraint to transporters (was unconstrained text)
-- 3. Drop dead functions: validate_status_transition() uses obsolete status names;
--    update_daily_statistics() tries to INSERT into daily_statistics which is now a VIEW

-- ─── 1. transporters.updated_at ──────────────────────────────────────────────

ALTER TABLE public.transporters
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill from created_at for existing rows
UPDATE public.transporters
SET updated_at = created_at
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_transporters_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transporters_updated_at ON public.transporters;

CREATE TRIGGER trg_transporters_updated_at
  BEFORE UPDATE ON public.transporters
  FOR EACH ROW EXECUTE FUNCTION public.set_transporters_updated_at();


-- ─── 2. transporters.status CHECK ────────────────────────────────────────────

-- Sanitize any NULL or out-of-range values before adding the constraint
-- (column has no NOT NULL, so NULLs are possible on old rows)
UPDATE public.transporters
  SET status = 'available'
  WHERE status IS NULL OR status NOT IN ('available', 'busy', 'inactive');

ALTER TABLE public.transporters
  DROP CONSTRAINT IF EXISTS transporters_status_check;

ALTER TABLE public.transporters
  ADD CONSTRAINT transporters_status_check
    CHECK (status IN ('available', 'busy', 'inactive'));


-- ─── 3. Drop dead functions ───────────────────────────────────────────────────

-- validate_status_transition(): uses old status names (pending/paid/in_transit/at_relay...)
-- that no longer match the current shipment_status ENUM. Not called anywhere in the codebase.
DROP FUNCTION IF EXISTS public.validate_status_transition(text, text);

-- update_daily_statistics(): tries to INSERT into daily_statistics, which is now a VIEW
-- (defined in migration 20260521010000_create_analytics_views.sql). The VIEW auto-aggregates
-- from shipments in real time, so this function is both broken and unnecessary.
DROP FUNCTION IF EXISTS public.update_daily_statistics();
