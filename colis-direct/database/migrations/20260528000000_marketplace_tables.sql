-- ============================================================
-- Migration: marketplace_tables
-- ColisDirect Marketplace — tables fondatrices
-- Commission configurable, portefeuille livreur, offres de
-- course (dispatch actif) et candidatures livreur indépendant.
-- ============================================================

-- 1. Taux de commission ColisDirect (configurable par admin)
CREATE TABLE IF NOT EXISTS commission_settings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_percent   NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  effective_from TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES users(id),
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO commission_settings (rate_percent, notes)
VALUES (20.00, 'Taux initial marketplace ColisDirect')
ON CONFLICT DO NOTHING;

-- 2. Portefeuille livreur — solde disponible + totaux
CREATE TABLE IF NOT EXISTS transporter_wallets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id       UUID NOT NULL REFERENCES transporters(id) ON DELETE CASCADE,
  balance_fcfa         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned_fcfa    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn_fcfa NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(transporter_id)
);

-- Créer un portefeuille vide pour chaque livreur existant
INSERT INTO transporter_wallets (transporter_id)
SELECT id FROM transporters
ON CONFLICT (transporter_id) DO NOTHING;

-- 3. Historique des transactions du portefeuille
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id         UUID NOT NULL REFERENCES transporters(id),
  shipment_id            UUID REFERENCES shipments(id),
  type                   TEXT NOT NULL CHECK (type IN (
                            'commission_earned', 'withdrawal',
                            'adjustment', 'bonus'
                          )),
  amount_fcfa            NUMERIC(12,2) NOT NULL,
  commission_rate_percent NUMERIC(5,2),
  gross_amount_fcfa      NUMERIC(12,2),
  colisdirect_fee_fcfa   NUMERIC(12,2),
  status                 TEXT NOT NULL DEFAULT 'completed' CHECK (status IN (
                            'pending', 'completed', 'failed', 'reversed'
                          )),
  orange_money_ref       TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Offres de course — dispatch actif vers les livreurs
CREATE TABLE IF NOT EXISTS delivery_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  transporter_id  UUID NOT NULL REFERENCES transporters(id),
  offered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  responded_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                    'pending', 'accepted', 'declined', 'expired', 'cancelled'
                  )),
  offer_round     INT NOT NULL DEFAULT 1,
  net_earnings_fcfa NUMERIC(10,2),
  UNIQUE(shipment_id, transporter_id, offer_round)
);

-- 5. Candidatures livreur indépendant (process similaire aux relais)
CREATE TABLE IF NOT EXISTS transporter_applications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  phone                   TEXT NOT NULL,
  email                   TEXT NOT NULL,
  vehicle_type            TEXT NOT NULL CHECK (vehicle_type IN (
                             'moto', 'velo', 'voiture', 'camionnette', 'pied'
                           )),
  license_plate           TEXT,
  id_card_url             TEXT,
  selfie_url              TEXT,
  vehicle_photo_url       TEXT,
  preferred_zones         TEXT[] NOT NULL DEFAULT '{}',
  commune                 TEXT NOT NULL,
  quartier                TEXT,
  address                 TEXT,
  description             TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                             'pending', 'approved', 'rejected', 'on_hold'
                           )),
  reviewed_by             UUID REFERENCES users(id),
  reviewed_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  notes                   TEXT,
  approved_transporter_id UUID REFERENCES transporters(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Index performance
CREATE INDEX IF NOT EXISTS idx_delivery_offers_shipment
  ON delivery_offers(shipment_id);

CREATE INDEX IF NOT EXISTS idx_delivery_offers_transporter_status
  ON delivery_offers(transporter_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_delivery_offers_expires
  ON delivery_offers(expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_wallet_tx_transporter
  ON wallet_transactions(transporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_shipment
  ON wallet_transactions(shipment_id);

CREATE INDEX IF NOT EXISTS idx_transporter_applications_status
  ON transporter_applications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transporter_applications_email
  ON transporter_applications(email);
