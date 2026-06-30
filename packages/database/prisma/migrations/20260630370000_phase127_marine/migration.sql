-- Phase 127: Marine Fleet Management
CREATE TABLE IF NOT EXISTS mar_vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  imo_number VARCHAR(20),
  type VARCHAR(50) NOT NULL,
  flag_country VARCHAR(3),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mar_vessels_tenant_id_idx ON mar_vessels(tenant_id);

CREATE TABLE IF NOT EXISTS mar_voyages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id UUID NOT NULL REFERENCES mar_vessels(id) ON DELETE CASCADE,
  voyage_number VARCHAR(100) NOT NULL,
  departure_port VARCHAR(100) NOT NULL,
  arrival_port VARCHAR(100) NOT NULL,
  departed_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mar_voyages_vessel_id_idx ON mar_voyages(vessel_id);

CREATE TABLE IF NOT EXISTS mar_cargo_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id UUID NOT NULL REFERENCES mar_voyages(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  weight_kg DECIMAL(12,2),
  commodity VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'loaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mar_cargo_manifests_voyage_id_idx ON mar_cargo_manifests(voyage_id);
