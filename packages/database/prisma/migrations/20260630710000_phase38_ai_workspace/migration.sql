-- Phase 38: Reno AI Workspace & Universal Desktop Assistant

CREATE TABLE IF NOT EXISTS aiw_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(500),
  provider VARCHAR(50) NOT NULL DEFAULT 'reno-brain',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aiw_sessions_tenant_id_idx ON aiw_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS aiw_sessions_user_id_idx ON aiw_sessions(user_id);

CREATE TABLE IF NOT EXISTS aiw_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES aiw_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  provider VARCHAR(50),
  tokens INT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aiw_messages_session_id_idx ON aiw_messages(session_id);

CREATE TABLE IF NOT EXISTS aiw_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  key VARCHAR(500) NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, type, key)
);
CREATE INDEX IF NOT EXISTS aiw_memory_tenant_id_idx ON aiw_memory(tenant_id);
CREATE INDEX IF NOT EXISTS aiw_memory_user_id_idx ON aiw_memory(user_id);

CREATE TABLE IF NOT EXISTS aiw_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES aiw_sessions(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aiw_tasks_tenant_id_idx ON aiw_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS aiw_tasks_user_id_idx ON aiw_tasks(user_id);

CREATE TABLE IF NOT EXISTS aiw_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL,
  size_bytes INT,
  summary TEXT,
  analysis JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aiw_documents_tenant_id_idx ON aiw_documents(tenant_id);
CREATE INDEX IF NOT EXISTS aiw_documents_user_id_idx ON aiw_documents(user_id);

CREATE TABLE IF NOT EXISTS aiw_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query VARCHAR(1000) NOT NULL,
  modules TEXT[] NOT NULL DEFAULT '{}',
  result_count INT NOT NULL DEFAULT 0,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aiw_search_logs_tenant_id_idx ON aiw_search_logs(tenant_id);
