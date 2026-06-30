-- Phase 126: Agriculture Management
CREATE TABLE IF NOT EXISTS agr_farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(500),
  area_ha DECIMAL(10,2),
  soil_type VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agr_farms_tenant_id_idx ON agr_farms(tenant_id);

CREATE TABLE IF NOT EXISTS agr_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES agr_farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  variety VARCHAR(100),
  planted_at DATE,
  expected_harvest_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'growing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agr_crops_farm_id_idx ON agr_crops(farm_id);

CREATE TABLE IF NOT EXISTS agr_harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES agr_crops(id) ON DELETE CASCADE,
  yield_kg DECIMAL(10,2) NOT NULL,
  harvested_at DATE NOT NULL,
  quality VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agr_harvests_crop_id_idx ON agr_harvests(crop_id);
