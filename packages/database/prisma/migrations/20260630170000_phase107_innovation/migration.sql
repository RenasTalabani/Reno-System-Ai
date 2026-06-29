-- Phase 107: Innovation Lab / Idea Management
CREATE TABLE IF NOT EXISTS inn_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  submitted_by UUID NOT NULL,
  votes INT NOT NULL DEFAULT 0,
  score DECIMAL(5,2),
  estimated_roi DECIMAL(14,2),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inn_ideas_tenant ON inn_ideas(tenant_id);

CREATE TABLE IF NOT EXISTS inn_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES inn_ideas(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL,
  feasibility INT,
  impact INT,
  effort INT,
  score DECIMAL(5,2),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inn_evaluations_idea ON inn_evaluations(idea_id);
