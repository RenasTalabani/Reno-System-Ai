CREATE TABLE IF NOT EXISTS pct_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(30),
  address VARCHAR(500) NOT NULL,
  pest_type VARCHAR(100) NOT NULL,
  contract_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pct_contracts_tenant_id_idx ON pct_contracts(tenant_id);

CREATE TABLE IF NOT EXISTS pct_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES pct_contracts(id) ON DELETE CASCADE,
  technician_id UUID,
  visit_date TIMESTAMPTZ NOT NULL,
  treatment VARCHAR(255),
  notes TEXT,
  outcome VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pct_visits_contract_id_idx ON pct_visits(contract_id);
