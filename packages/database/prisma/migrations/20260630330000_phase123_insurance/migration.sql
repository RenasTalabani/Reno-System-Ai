-- Phase 123: Insurance Management
CREATE TABLE IF NOT EXISTS ins_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  policy_number VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  holder_email VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  premium DECIMAL(14,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ins_policies_tenant_id_idx ON ins_policies(tenant_id);

CREATE TABLE IF NOT EXISTS ins_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES ins_policies(id) ON DELETE CASCADE,
  claim_number VARCHAR(100) NOT NULL,
  incident_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(14,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  settled_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ins_claims_policy_id_idx ON ins_claims(policy_id);
