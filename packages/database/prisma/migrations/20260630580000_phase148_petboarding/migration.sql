CREATE TABLE IF NOT EXISTS pbd_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  owner_name VARCHAR(255) NOT NULL,
  owner_phone VARCHAR(30),
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pbd_pets_tenant_id_idx ON pbd_pets(tenant_id);

CREATE TABLE IF NOT EXISTS pbd_stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pbd_pets(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  kennel VARCHAR(50),
  daily_rate NUMERIC(8,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'booked',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pbd_stays_pet_id_idx ON pbd_stays(pet_id);
