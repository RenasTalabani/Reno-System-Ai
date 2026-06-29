-- Phase 108: Subscription Billing 2.0
CREATE TABLE IF NOT EXISTS sub2_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  trial_days INT NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub2_plans_tenant ON sub2_plans(tenant_id);

CREATE TABLE IF NOT EXISTS sub2_subs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES sub2_plans(id),
  customer_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub2_subs_tenant ON sub2_subs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub2_subs_customer ON sub2_subs(tenant_id, customer_id);
