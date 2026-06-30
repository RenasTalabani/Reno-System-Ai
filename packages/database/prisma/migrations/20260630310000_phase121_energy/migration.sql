-- Phase 121: Energy Management
CREATE TABLE IF NOT EXISTS engy_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(30) NOT NULL,
  location VARCHAR(300),
  unit VARCHAR(20) NOT NULL DEFAULT 'kWh',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS engy_meters_tenant_id_idx ON engy_meters(tenant_id);

CREATE TABLE IF NOT EXISTS engy_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES engy_meters(id) ON DELETE CASCADE,
  value DECIMAL(14,4) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS engy_readings_meter_id_idx ON engy_readings(meter_id);

CREATE TABLE IF NOT EXISTS engy_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES engy_meters(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  threshold DECIMAL(14,4) NOT NULL,
  actual_value DECIMAL(14,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS engy_alerts_meter_id_idx ON engy_alerts(meter_id);
