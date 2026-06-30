-- Phase 140: Automotive Dealership Management
CREATE TABLE IF NOT EXISTS auto_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  vin VARCHAR(50) NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  color VARCHAR(50),
  mileage INT,
  price DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  condition VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auto_vehicles_tenant_id_idx ON auto_vehicles(tenant_id);

CREATE TABLE IF NOT EXISTS auto_test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES auto_vehicles(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(30),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auto_test_drives_vehicle_id_idx ON auto_test_drives(vehicle_id);

CREATE TABLE IF NOT EXISTS auto_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES auto_vehicles(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  sale_date DATE NOT NULL,
  sales_rep_id UUID,
  financed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auto_sales_tenant_id_idx ON auto_sales(tenant_id);
CREATE INDEX IF NOT EXISTS auto_sales_vehicle_id_idx ON auto_sales(vehicle_id);
