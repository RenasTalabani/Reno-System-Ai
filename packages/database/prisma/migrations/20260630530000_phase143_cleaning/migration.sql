CREATE TABLE IF NOT EXISTS cln_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cln_jobs_tenant_id_idx ON cln_jobs(tenant_id);

CREATE TABLE IF NOT EXISTS cln_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cln_jobs(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cln_assignments_job_id_idx ON cln_assignments(job_id);
