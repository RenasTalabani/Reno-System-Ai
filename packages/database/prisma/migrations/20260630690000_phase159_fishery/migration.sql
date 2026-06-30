CREATE TABLE IF NOT EXISTS fsh_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fsh_sites_tenant_id_idx ON fsh_sites(tenant_id);

CREATE TABLE IF NOT EXISTS fsh_catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES fsh_sites(id) ON DELETE CASCADE,
  species VARCHAR(100) NOT NULL,
  quantity NUMERIC(10,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  caught_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fsh_catches_site_id_idx ON fsh_catches(site_id);
