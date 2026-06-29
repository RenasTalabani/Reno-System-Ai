-- Phase 110: Data Pipeline & ETL
CREATE TABLE IF NOT EXISTS etl_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_test_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_etl_connectors_tenant ON etl_connectors(tenant_id);

CREATE TABLE IF NOT EXISTS etl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES etl_connectors(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  schedule VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  rows_processed BIGINT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_etl_jobs_connector ON etl_jobs(connector_id);
