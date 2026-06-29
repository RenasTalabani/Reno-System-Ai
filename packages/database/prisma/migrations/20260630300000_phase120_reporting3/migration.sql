-- Phase 120: Advanced Reporting 3.0
CREATE TABLE IF NOT EXISTS rpt3_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  type VARCHAR(30) NOT NULL,
  query TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  schedule VARCHAR(100),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rpt3_templates_tenant ON rpt3_templates(tenant_id);

CREATE TABLE IF NOT EXISTS rpt3_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES rpt3_templates(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  row_count BIGINT,
  size_bytes BIGINT,
  storage_key VARCHAR(1000),
  error_msg TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_rpt3_runs_template ON rpt3_runs(template_id);
