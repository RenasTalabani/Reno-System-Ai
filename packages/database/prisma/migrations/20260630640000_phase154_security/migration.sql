CREATE TABLE IF NOT EXISTS sec_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  site_address VARCHAR(500) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sec_contracts_tenant_id_idx ON sec_contracts(tenant_id);

CREATE TABLE IF NOT EXISTS sec_patrols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES sec_contracts(id) ON DELETE CASCADE,
  officer_id UUID,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  notes TEXT,
  incident BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sec_patrols_contract_id_idx ON sec_patrols(contract_id);
