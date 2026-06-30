CREATE TABLE IF NOT EXISTS cwk_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  capacity INT NOT NULL,
  price_per_day NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cwk_spaces_tenant_id_idx ON cwk_spaces(tenant_id);

CREATE TABLE IF NOT EXISTS cwk_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES cwk_spaces(id) ON DELETE CASCADE,
  member_name VARCHAR(255) NOT NULL,
  member_email VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cwk_reservations_tenant_id_idx ON cwk_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS cwk_reservations_space_id_idx ON cwk_reservations(space_id);
