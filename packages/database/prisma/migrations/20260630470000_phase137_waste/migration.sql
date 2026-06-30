-- Phase 137: Waste Management & Recycling
CREATE TABLE IF NOT EXISTS wst_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  area VARCHAR(300),
  frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
  waste_type VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wst_routes_tenant_id_idx ON wst_routes(tenant_id);

CREATE TABLE IF NOT EXISTS wst_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES wst_routes(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ NOT NULL,
  weight_kg DECIMAL(10,2),
  vehicle_id VARCHAR(100),
  operator_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wst_collections_route_id_idx ON wst_collections(route_id);
