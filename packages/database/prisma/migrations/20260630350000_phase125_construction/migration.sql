-- Phase 125: Construction Management
CREATE TABLE IF NOT EXISTS con_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  site_address VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'planning',
  budget DECIMAL(14,2),
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS con_projects_tenant_id_idx ON con_projects(tenant_id);

CREATE TABLE IF NOT EXISTS con_rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES con_projects(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  due_date DATE,
  submitted_by UUID NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS con_rfis_project_id_idx ON con_rfis(project_id);

CREATE TABLE IF NOT EXISTS con_punch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES con_projects(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  due_date DATE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS con_punch_items_project_id_idx ON con_punch_items(project_id);
