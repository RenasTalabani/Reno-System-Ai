-- Phase 117: Franchise Management
CREATE TABLE IF NOT EXISTS franchisees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  owner_id UUID NOT NULL,
  territory VARCHAR(200),
  opened_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  royalty_rate DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_franchisees_tenant ON franchisees(tenant_id);

CREATE TABLE IF NOT EXISTS franchise_royalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchisee_id UUID NOT NULL REFERENCES franchisees(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL,
  gross_sales DECIMAL(14,2) NOT NULL,
  royalty_amount DECIMAL(12,2) NOT NULL,
  paid_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_franchise_royalties_franchisee ON franchise_royalties(franchisee_id);

CREATE TABLE IF NOT EXISTS franchise_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchisee_id UUID NOT NULL REFERENCES franchisees(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL,
  score DECIMAL(5,2),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  scheduled_at DATE NOT NULL,
  completed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_franchise_inspections_franchisee ON franchise_inspections(franchisee_id);
