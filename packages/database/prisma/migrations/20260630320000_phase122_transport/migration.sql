-- Phase 122: Transportation & Logistics
CREATE TABLE IF NOT EXISTS trp_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  origin VARCHAR(300) NOT NULL,
  destination VARCHAR(300) NOT NULL,
  distance_km DECIMAL(10,2),
  estimated_mins INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trp_routes_tenant_id_idx ON trp_routes(tenant_id);

CREATE TABLE IF NOT EXISTS trp_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  license_no VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  vehicle_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trp_drivers_tenant_id_idx ON trp_drivers(tenant_id);

CREATE TABLE IF NOT EXISTS trp_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route_id UUID REFERENCES trp_routes(id),
  driver_id UUID REFERENCES trp_drivers(id),
  tracking_code VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  actual_delivered_at TIMESTAMPTZ,
  cargo JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trp_shipments_tenant_id_idx ON trp_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS trp_shipments_route_id_idx ON trp_shipments(route_id);
CREATE INDEX IF NOT EXISTS trp_shipments_driver_id_idx ON trp_shipments(driver_id);
