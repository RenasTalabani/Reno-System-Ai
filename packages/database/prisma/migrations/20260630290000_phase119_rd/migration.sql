-- Phase 119: Research & Development
CREATE TABLE IF NOT EXISTS rd_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  lead_id UUID NOT NULL,
  budget DECIMAL(14,2) NOT NULL DEFAULT 0,
  spent_budget DECIMAL(14,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  abstract TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_projects_tenant ON rd_projects(tenant_id);

CREATE TABLE IF NOT EXISTS rd_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rd_projects(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  hypothesis TEXT,
  methodology TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  started_at DATE,
  completed_at DATE,
  results TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_experiments_project ON rd_experiments(project_id);

CREATE TABLE IF NOT EXISTS rd_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rd_projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  journal VARCHAR(300),
  authors TEXT[] NOT NULL DEFAULT '{}',
  doi VARCHAR(200),
  published_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_publications_project ON rd_publications(project_id);
