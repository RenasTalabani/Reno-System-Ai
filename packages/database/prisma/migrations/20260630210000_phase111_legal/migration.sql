-- Phase 111: Legal Case Management
CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  case_number VARCHAR(50) NOT NULL,
  title VARCHAR(300) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  client_name VARCHAR(255) NOT NULL,
  assigned_to UUID NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_cases_tenant ON legal_cases(tenant_id);

CREATE TABLE IF NOT EXISTS legal_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL,
  description VARCHAR(500) NOT NULL,
  hours DECIMAL(6,2) NOT NULL,
  rate_per_hour DECIMAL(10,2) NOT NULL,
  billed_at DATE NOT NULL,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_timesheets_case ON legal_timesheets(case_id);
