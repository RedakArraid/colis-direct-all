-- Table des incidents signalés par les transporteurs
CREATE TABLE IF NOT EXISTS public.shipment_incidents (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id     UUID          NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  tracking_number TEXT          NOT NULL,
  transporter_id  UUID          NOT NULL REFERENCES public.transporters(id),
  incident_type   TEXT          NOT NULL
    CHECK (incident_type IN ('client_absent', 'adresse_erronee', 'colis_endommage', 'relais_ferme', 'autre')),
  description     TEXT          NOT NULL,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  resolved        BOOLEAN       NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  reported_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_incidents_shipment
  ON public.shipment_incidents (shipment_id);

CREATE INDEX IF NOT EXISTS idx_shipment_incidents_transporter
  ON public.shipment_incidents (transporter_id);

CREATE INDEX IF NOT EXISTS idx_shipment_incidents_reported_at
  ON public.shipment_incidents (reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_shipment_incidents_unresolved
  ON public.shipment_incidents (reported_at DESC)
  WHERE resolved = FALSE;
