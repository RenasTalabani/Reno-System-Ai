CREATE TABLE IF NOT EXISTS cnf_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  capacity INT NOT NULL,
  amenities TEXT,
  price_per_day NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cnf_halls_tenant_id_idx ON cnf_halls(tenant_id);

CREATE TABLE IF NOT EXISTS cnf_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  hall_id UUID NOT NULL REFERENCES cnf_halls(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  attendees INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cnf_bookings_tenant_id_idx ON cnf_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS cnf_bookings_hall_id_idx ON cnf_bookings(hall_id);
