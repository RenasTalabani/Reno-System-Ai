-- Phase 49: AI Universal Action Layer (MCP & Tool Ecosystem)
-- Creates: ual_tools, ual_execution_policies, ual_tool_executions, ual_mcp_servers

CREATE TABLE "ual_tools" (
  "id"              UUID              NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID              NOT NULL,
  "name"            TEXT              NOT NULL,
  "slug"            TEXT              NOT NULL,
  "version"         TEXT              NOT NULL DEFAULT '1.0.0',
  "description"     TEXT,
  "category"        TEXT              NOT NULL DEFAULT 'custom',
  "provider"        TEXT              NOT NULL DEFAULT 'local',
  "endpoint"        TEXT,
  "schema"          JSONB             NOT NULL DEFAULT '{}',
  "permissions"     JSONB             NOT NULL DEFAULT '{}',
  "status"          TEXT              NOT NULL DEFAULT 'active',
  "is_system"       BOOLEAN           NOT NULL DEFAULT false,
  "total_calls"     INTEGER           NOT NULL DEFAULT 0,
  "total_cost"      DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "avg_duration_ms" INTEGER,
  "created_by_id"   UUID,
  "created_at"      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "ual_tools_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ual_tools_tenant_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "ual_tools_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ual_tools_tenant_id_idx" ON "ual_tools"("tenant_id");

CREATE TABLE "ual_execution_policies" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "tool_id"      UUID        NOT NULL,
  "name"         TEXT        NOT NULL,
  "subject_type" TEXT        NOT NULL,
  "subject_id"   TEXT,
  "action"       TEXT        NOT NULL DEFAULT 'allow',
  "rate_limit"   INTEGER,
  "conditions"   JSONB       NOT NULL DEFAULT '{}',
  "priority"     INTEGER     NOT NULL DEFAULT 0,
  "is_active"    BOOLEAN     NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ual_execution_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ual_policies_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "ual_policies_tool_fk"   FOREIGN KEY ("tool_id") REFERENCES "ual_tools"("id") ON DELETE CASCADE
);
CREATE INDEX "ual_execution_policies_tenant_id_idx" ON "ual_execution_policies"("tenant_id");
CREATE INDEX "ual_execution_policies_tool_id_idx"   ON "ual_execution_policies"("tool_id");

CREATE TABLE "ual_tool_executions" (
  "id"             UUID              NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID              NOT NULL,
  "tool_id"        UUID              NOT NULL,
  "agent_id"       TEXT,
  "user_id"        UUID,
  "task_id"        UUID,
  "status"         TEXT              NOT NULL DEFAULT 'pending',
  "input"          JSONB             NOT NULL DEFAULT '{}',
  "output"         JSONB,
  "error_message"  TEXT,
  "duration_ms"    INTEGER,
  "cost"           DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "policy_action"  TEXT,
  "started_at"     TIMESTAMPTZ,
  "completed_at"   TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "ual_tool_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ual_executions_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "ual_executions_tool_fk"   FOREIGN KEY ("tool_id") REFERENCES "ual_tools"("id") ON DELETE CASCADE
);
CREATE INDEX "ual_tool_executions_tenant_id_idx" ON "ual_tool_executions"("tenant_id");
CREATE INDEX "ual_tool_executions_tool_id_idx"   ON "ual_tool_executions"("tool_id");
CREATE INDEX "ual_tool_executions_agent_id_idx"  ON "ual_tool_executions"("agent_id");

CREATE TABLE "ual_mcp_servers" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "name"            TEXT        NOT NULL,
  "slug"            TEXT        NOT NULL,
  "description"     TEXT,
  "endpoint"        TEXT        NOT NULL,
  "protocol"        TEXT        NOT NULL DEFAULT 'http',
  "auth_type"       TEXT        NOT NULL DEFAULT 'none',
  "auth_config"     JSONB       NOT NULL DEFAULT '{}',
  "tool_manifest"   JSONB       NOT NULL DEFAULT '[]',
  "status"          TEXT        NOT NULL DEFAULT 'active',
  "last_checked_at" TIMESTAMPTZ,
  "health_score"    INTEGER,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ual_mcp_servers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ual_mcp_servers_tenant_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "ual_mcp_servers_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ual_mcp_servers_tenant_id_idx" ON "ual_mcp_servers"("tenant_id");
