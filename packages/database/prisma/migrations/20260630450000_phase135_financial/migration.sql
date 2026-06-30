-- Phase 135: Financial Planning & Advisory
CREATE TABLE IF NOT EXISTS fpa_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  risk_profile VARCHAR(20),
  net_worth DECIMAL(16,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  advisor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fpa_clients_tenant_id_idx ON fpa_clients(tenant_id);

CREATE TABLE IF NOT EXISTS fpa_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES fpa_clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  goal DECIMAL(16,2),
  target_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fpa_plans_client_id_idx ON fpa_plans(client_id);
