-- Phase 103: Grant & Funding Management
CREATE TABLE IF NOT EXISTS grant_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  funder VARCHAR(200) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'prospect',
  deadline DATE,
  awarded_at DATE,
  start_date DATE,
  end_date DATE,
  owner_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grant_grants_tenant ON grant_grants(tenant_id);

CREATE TABLE IF NOT EXISTS grant_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES grant_grants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  completed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grant_milestones_grant ON grant_milestones(grant_id);
