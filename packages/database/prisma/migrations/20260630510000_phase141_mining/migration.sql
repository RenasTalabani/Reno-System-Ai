CREATE TABLE IF NOT EXISTS mne_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  mineral VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mne_sites_tenant_id_idx ON mne_sites(tenant_id);

CREATE TABLE IF NOT EXISTS mne_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES mne_sites(id) ON DELETE CASCADE,
  operator_id UUID,
  type VARCHAR(50) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  operated_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mne_operations_site_id_idx ON mne_operations(site_id);
