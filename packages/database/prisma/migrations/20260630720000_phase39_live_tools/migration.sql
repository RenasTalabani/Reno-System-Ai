-- Phase 39: AI Workspace Live Tools
-- All tool actions go through: PROPOSE → APPROVE → EXECUTE. No auto-execution.

CREATE TABLE IF NOT EXISTS awlt_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tool VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  result JSONB,
  ai_explanation TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS awlt_proposals_tenant_id_idx ON awlt_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS awlt_proposals_user_id_idx ON awlt_proposals(user_id);
CREATE INDEX IF NOT EXISTS awlt_proposals_tenant_tool_idx ON awlt_proposals(tenant_id, tool);
CREATE INDEX IF NOT EXISTS awlt_proposals_tenant_status_idx ON awlt_proposals(tenant_id, status);

CREATE TABLE IF NOT EXISTS awlt_command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES awlt_proposals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tool VARCHAR(50) NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  status VARCHAR(20) NOT NULL,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS awlt_command_logs_tenant_id_idx ON awlt_command_logs(tenant_id);
CREATE INDEX IF NOT EXISTS awlt_command_logs_proposal_id_idx ON awlt_command_logs(proposal_id);

CREATE TABLE IF NOT EXISTS awlt_project_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, name, type)
);
CREATE INDEX IF NOT EXISTS awlt_project_contexts_tenant_id_idx ON awlt_project_contexts(tenant_id);
