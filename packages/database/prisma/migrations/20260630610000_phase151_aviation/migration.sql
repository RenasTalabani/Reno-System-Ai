CREATE TABLE IF NOT EXISTS avn_aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  tail_number VARCHAR(20) NOT NULL,
  type VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100),
  capacity INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS avn_aircraft_tenant_id_idx ON avn_aircraft(tenant_id);

CREATE TABLE IF NOT EXISTS avn_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES avn_aircraft(id) ON DELETE CASCADE,
  flight_no VARCHAR(20) NOT NULL,
  origin VARCHAR(10) NOT NULL,
  destination VARCHAR(10) NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  arrival_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS avn_flights_tenant_id_idx ON avn_flights(tenant_id);
CREATE INDEX IF NOT EXISTS avn_flights_aircraft_id_idx ON avn_flights(aircraft_id);
