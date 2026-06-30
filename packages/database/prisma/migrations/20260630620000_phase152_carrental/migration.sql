CREATE TABLE IF NOT EXISTS crn_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  plate VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  daily_rate NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crn_vehicles_tenant_id_idx ON crn_vehicles(tenant_id);

CREATE TABLE IF NOT EXISTS crn_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES crn_vehicles(id) ON DELETE CASCADE,
  renter_name VARCHAR(255) NOT NULL,
  renter_phone VARCHAR(30),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crn_rentals_tenant_id_idx ON crn_rentals(tenant_id);
CREATE INDEX IF NOT EXISTS crn_rentals_vehicle_id_idx ON crn_rentals(vehicle_id);
