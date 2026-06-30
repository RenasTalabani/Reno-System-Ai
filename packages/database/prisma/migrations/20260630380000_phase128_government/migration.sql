-- Phase 128: Government & Compliance Portal
CREATE TABLE IF NOT EXISTS gov_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  reg_code VARCHAR(100),
  authority VARCHAR(255),
  effective_date DATE,
  category VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gov_regulations_tenant_id_idx ON gov_regulations(tenant_id);

CREATE TABLE IF NOT EXISTS gov_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  regulation_id UUID REFERENCES gov_regulations(id),
  permit_number VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  issued_date DATE,
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gov_permits_tenant_id_idx ON gov_permits(tenant_id);
CREATE INDEX IF NOT EXISTS gov_permits_regulation_id_idx ON gov_permits(regulation_id);

CREATE TABLE IF NOT EXISTS gov_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  regulation_id UUID REFERENCES gov_regulations(id),
  title VARCHAR(500) NOT NULL,
  due_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  filed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gov_filings_tenant_id_idx ON gov_filings(tenant_id);
CREATE INDEX IF NOT EXISTS gov_filings_regulation_id_idx ON gov_filings(regulation_id);
