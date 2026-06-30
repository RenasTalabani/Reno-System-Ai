CREATE TABLE IF NOT EXISTS phx_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  manufacturer VARCHAR(255),
  category VARCHAR(100),
  dosage VARCHAR(100),
  stock INT NOT NULL DEFAULT 0,
  unit_price NUMERIC(10,2) NOT NULL,
  reorder_level INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS phx_drugs_tenant_id_idx ON phx_drugs(tenant_id);

CREATE TABLE IF NOT EXISTS phx_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  doctor_name VARCHAR(255),
  drug_id UUID NOT NULL REFERENCES phx_drugs(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  dispensed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS phx_prescriptions_tenant_id_idx ON phx_prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS phx_prescriptions_drug_id_idx ON phx_prescriptions(drug_id);
