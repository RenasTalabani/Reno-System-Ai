-- Phase 115: Retail Operations
CREATE TABLE IF NOT EXISTS retail_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  phone VARCHAR(30),
  manager_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  open_time VARCHAR(10),
  close_time VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retail_stores_tenant ON retail_stores(tenant_id);

CREATE TABLE IF NOT EXISTS retail_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES retail_stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'closed',
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10,2)
);
CREATE INDEX IF NOT EXISTS idx_retail_registers_store ON retail_registers(store_id);
