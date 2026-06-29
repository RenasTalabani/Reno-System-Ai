-- Phase 104: Property & Real Estate Management
CREATE TABLE IF NOT EXISTS prop_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  total_units INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_properties_tenant ON prop_properties(tenant_id);

CREATE TABLE IF NOT EXISTS prop_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES prop_properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  floor INT,
  size_sqm DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'vacant',
  monthly_rent DECIMAL(10,2),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_units_property ON prop_units(property_id);

CREATE TABLE IF NOT EXISTS prop_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES prop_units(id) ON DELETE CASCADE,
  tenant_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  signed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_leases_unit ON prop_leases(unit_id);
