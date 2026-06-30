CREATE TABLE IF NOT EXISTS txt_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  season VARCHAR(50),
  launch_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'design',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS txt_collections_tenant_id_idx ON txt_collections(tenant_id);

CREATE TABLE IF NOT EXISTS txt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES txt_collections(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  fabric VARCHAR(100),
  color VARCHAR(50),
  size VARCHAR(20),
  stock INT NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS txt_items_collection_id_idx ON txt_items(collection_id);
