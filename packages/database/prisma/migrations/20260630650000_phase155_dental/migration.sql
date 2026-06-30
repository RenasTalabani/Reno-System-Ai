CREATE TABLE IF NOT EXISTS dnt_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  dob DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dnt_patients_tenant_id_idx ON dnt_patients(tenant_id);

CREATE TABLE IF NOT EXISTS dnt_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES dnt_patients(id) ON DELETE CASCADE,
  dentist_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL,
  procedure VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dnt_appointments_patient_id_idx ON dnt_appointments(patient_id);
