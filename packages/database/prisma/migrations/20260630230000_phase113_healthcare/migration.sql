-- Phase 113: Healthcare / Appointments
CREATE TABLE IF NOT EXISTS hc_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(30),
  blood_type VARCHAR(5),
  allergies TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hc_patients_tenant ON hc_patients(tenant_id);

CREATE TABLE IF NOT EXISTS hc_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES hc_patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  type VARCHAR(100) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_mins INT NOT NULL DEFAULT 30,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hc_appointments_patient ON hc_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_hc_appointments_provider ON hc_appointments(provider_id, scheduled_at);
