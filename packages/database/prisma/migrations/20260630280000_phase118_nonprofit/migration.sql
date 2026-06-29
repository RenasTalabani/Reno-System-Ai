-- Phase 118: Non-Profit / Donor Management
CREATE TABLE IF NOT EXISTS np_donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  type VARCHAR(20) NOT NULL DEFAULT 'individual',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  total_given DECIMAL(14,2) NOT NULL DEFAULT 0,
  first_gift_at DATE,
  last_gift_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_np_donors_tenant ON np_donors(tenant_id);

CREATE TABLE IF NOT EXISTS np_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES np_donors(id) ON DELETE CASCADE,
  campaign_id UUID,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  channel VARCHAR(20) NOT NULL DEFAULT 'online',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  received_at DATE NOT NULL,
  notes VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_np_donations_donor ON np_donations(donor_id);
