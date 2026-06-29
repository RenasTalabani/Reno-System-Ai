-- Phase 116: Print & Media Management
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  type VARCHAR(50) NOT NULL,
  format VARCHAR(20),
  quantity INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  cost DECIMAL(10,2),
  vendor_id UUID,
  submitted_by UUID NOT NULL,
  due_date DATE,
  delivered_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_print_jobs_tenant ON print_jobs(tenant_id);

CREATE TABLE IF NOT EXISTS print_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  storage_key VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_print_assets_job ON print_assets(job_id);
