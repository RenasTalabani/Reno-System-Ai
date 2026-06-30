CREATE TABLE IF NOT EXISTS adf_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  budget NUMERIC(15,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'proposal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS adf_projects_tenant_id_idx ON adf_projects(tenant_id);

CREATE TABLE IF NOT EXISTS adf_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES adf_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  deliverable TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS adf_milestones_project_id_idx ON adf_milestones(project_id);
