-- Phase 124: Real Estate CRM
CREATE TABLE IF NOT EXISTS re_crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  budget DECIMAL(14,2),
  property_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS re_crm_leads_tenant_id_idx ON re_crm_leads(tenant_id);

CREATE TABLE IF NOT EXISTS re_crm_showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES re_crm_leads(id) ON DELETE CASCADE,
  property_address VARCHAR(500) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS re_crm_showings_lead_id_idx ON re_crm_showings(lead_id);
