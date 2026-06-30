-- Phase 130: Digital Asset Management
CREATE TABLE IF NOT EXISTS dam_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dam_collections_tenant_id_idx ON dam_collections(tenant_id);

CREATE TABLE IF NOT EXISTS dam_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES dam_collections(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  rights_holder VARCHAR(255),
  license_type VARCHAR(50),
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dam_assets_collection_id_idx ON dam_assets(collection_id);

CREATE TABLE IF NOT EXISTS dam_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  channel VARCHAR(100) NOT NULL,
  distributed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dam_distributions_asset_id_idx ON dam_distributions(asset_id);
