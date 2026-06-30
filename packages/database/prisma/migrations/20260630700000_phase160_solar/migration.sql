CREATE TABLE IF NOT EXISTS slr_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  panel_count INT NOT NULL,
  capacity_kw NUMERIC(8,2) NOT NULL,
  installed_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS slr_installations_tenant_id_idx ON slr_installations(tenant_id);

CREATE TABLE IF NOT EXISTS slr_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL REFERENCES slr_installations(id) ON DELETE CASCADE,
  reading_at TIMESTAMPTZ NOT NULL,
  output_kwh NUMERIC(10,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS slr_readings_installation_id_idx ON slr_readings(installation_id);
