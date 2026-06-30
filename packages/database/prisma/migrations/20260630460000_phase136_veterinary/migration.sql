-- Phase 136: Veterinary Practice Management
CREATE TABLE IF NOT EXISTS vet_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  dob DATE,
  owner_name VARCHAR(255) NOT NULL,
  owner_phone VARCHAR(30),
  owner_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vet_pets_tenant_id_idx ON vet_pets(tenant_id);

CREATE TABLE IF NOT EXISTS vet_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES vet_pets(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  reason VARCHAR(500) NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  weight DECIMAL(6,2),
  vet_id UUID,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vet_visits_pet_id_idx ON vet_visits(pet_id);
