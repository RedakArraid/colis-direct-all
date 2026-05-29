CREATE TABLE IF NOT EXISTS delivery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_relay_id UUID NOT NULL REFERENCES relay_points(id),
  destination_zone_id UUID REFERENCES delivery_zones(id),
  destination_commune TEXT,
  batch_type TEXT NOT NULL DEFAULT 'relay_to_relay'
    CHECK (batch_type IN ('relay_to_relay', 'relay_to_home', 'mixed')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dispatched', 'accepted', 'in_progress', 'completed', 'expired', 'cancelled')),
  transporter_id UUID REFERENCES transporters(id),
  shipment_count INT NOT NULL DEFAULT 0,
  total_weight_kg NUMERIC(8,2),
  total_value_fcfa NUMERIC(12,2),
  net_earnings_fcfa NUMERIC(12,2),
  required_vehicle_types TEXT[] NOT NULL DEFAULT '{}',
  offered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_shipments (
  batch_id UUID NOT NULL REFERENCES delivery_batches(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  sequence_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (batch_id, shipment_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_batches_relay_status
  ON delivery_batches(origin_relay_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_transporter
  ON delivery_batches(transporter_id, status) WHERE status IN ('dispatched','accepted','in_progress');
CREATE INDEX IF NOT EXISTS idx_batch_shipments_shipment
  ON batch_shipments(shipment_id);

-- Config par défaut dans admin_settings
INSERT INTO admin_settings (key, value)
VALUES ('batchDispatch', '{"enabled": true, "minBatchSize": 3, "maxWaitHours": 2, "cronIntervalMinutes": 30, "offerDurationMinutes": 5}')
ON CONFLICT (key) DO NOTHING;
