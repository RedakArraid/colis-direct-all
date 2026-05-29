-- Allow relay partners to report incidents (make transporter_id nullable, add relay_partner_id)
ALTER TABLE public.shipment_incidents
  ALTER COLUMN transporter_id DROP NOT NULL;

ALTER TABLE public.shipment_incidents
  ADD COLUMN IF NOT EXISTS relay_partner_id UUID REFERENCES public.users(id);

-- At least one of transporter_id or relay_partner_id must be set
ALTER TABLE public.shipment_incidents
  ADD CONSTRAINT chk_incident_reporter
    CHECK (transporter_id IS NOT NULL OR relay_partner_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_shipment_incidents_relay_partner
  ON public.shipment_incidents (relay_partner_id);
