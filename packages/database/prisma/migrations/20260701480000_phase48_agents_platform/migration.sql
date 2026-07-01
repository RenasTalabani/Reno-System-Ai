-- Phase 48: AI Enterprise Agents Platform
-- Creates: eap_agents, eap_agent_memories, eap_agent_tasks, eap_agent_kpis,
--          eap_agent_collaborations, eap_agent_audit_logs

CREATE TABLE "eap_agents" (
  "id"            TEXT          NOT NULL,
  "tenant_id"     UUID          NOT NULL,
  "name"          TEXT          NOT NULL,
  "slug"          TEXT          NOT NULL,
  "type"          TEXT          NOT NULL DEFAULT 'custom',
  "description"   TEXT,
  "personality"   TEXT,
  "goals"         JSONB         NOT NULL DEFAULT '[]',
  "tools"         TEXT[]        NOT NULL DEFAULT '{}',
  "permissions"   JSONB         NOT NULL DEFAULT '{}',
  "status"        TEXT          NOT NULL DEFAULT 'active',
  "version"       INTEGER       NOT NULL DEFAULT 1,
  "total_tasks"   INTEGER       NOT NULL DEFAULT 0,
  "total_cost"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_by_id" UUID,
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "eap_agents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eap_agents_tenant_slug_key" UNIQUE ("tenant_id", "slug"),
  CONSTRAINT "eap_agents_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "eap_agents_tenant_id_idx" ON "eap_agents"("tenant_id");

CREATE TABLE "eap_agent_memories" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID          NOT NULL,
  "agent_id"    TEXT          NOT NULL,
  "key"         TEXT          NOT NULL,
  "value"       TEXT          NOT NULL,
  "importance"  TEXT          NOT NULL DEFAULT 'medium',
  "expires_at"  TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "eap_agent_memories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eap_agent_memories_agent_key_key" UNIQUE ("agent_id", "key"),
  CONSTRAINT "eap_agent_memories_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_memories_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "eap_agents"("id") ON DELETE CASCADE
);
CREATE INDEX "eap_agent_memories_tenant_id_idx" ON "eap_agent_memories"("tenant_id");

CREATE TABLE "eap_agent_tasks" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID          NOT NULL,
  "agent_id"      TEXT          NOT NULL,
  "title"         TEXT          NOT NULL,
  "description"   TEXT,
  "status"        TEXT          NOT NULL DEFAULT 'pending',
  "priority"      TEXT          NOT NULL DEFAULT 'medium',
  "input"         JSONB         NOT NULL DEFAULT '{}',
  "output"        JSONB,
  "plan"          JSONB,
  "error_message" TEXT,
  "started_at"    TIMESTAMPTZ,
  "completed_at"  TIMESTAMPTZ,
  "duration_ms"   INTEGER,
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "eap_agent_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eap_agent_tasks_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_tasks_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "eap_agents"("id") ON DELETE CASCADE
);
CREATE INDEX "eap_agent_tasks_tenant_id_idx" ON "eap_agent_tasks"("tenant_id");
CREATE INDEX "eap_agent_tasks_agent_id_idx" ON "eap_agent_tasks"("agent_id");

CREATE TABLE "eap_agent_kpis" (
  "id"        UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID          NOT NULL,
  "agent_id"  TEXT          NOT NULL,
  "name"      TEXT          NOT NULL,
  "value"     DOUBLE PRECISION NOT NULL,
  "target"    DOUBLE PRECISION,
  "unit"      TEXT,
  "period"    TEXT,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "eap_agent_kpis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eap_agent_kpis_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_kpis_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "eap_agents"("id") ON DELETE CASCADE
);
CREATE INDEX "eap_agent_kpis_tenant_id_idx" ON "eap_agent_kpis"("tenant_id");
CREATE INDEX "eap_agent_kpis_agent_id_idx" ON "eap_agent_kpis"("agent_id");

CREATE TABLE "eap_agent_collaborations" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "from_agent_id" TEXT        NOT NULL,
  "to_agent_id"   TEXT        NOT NULL,
  "task_id"       UUID,
  "message"       TEXT        NOT NULL,
  "type"          TEXT        NOT NULL DEFAULT 'request',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eap_agent_collaborations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eap_agent_collaborations_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_collaborations_from_fk" FOREIGN KEY ("from_agent_id") REFERENCES "eap_agents"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_collaborations_to_fk" FOREIGN KEY ("to_agent_id") REFERENCES "eap_agents"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_collaborations_task_fk" FOREIGN KEY ("task_id") REFERENCES "eap_agent_tasks"("id")
);
CREATE INDEX "eap_agent_collaborations_tenant_id_idx" ON "eap_agent_collaborations"("tenant_id");
CREATE INDEX "eap_agent_collaborations_from_agent_id_idx" ON "eap_agent_collaborations"("from_agent_id");
CREATE INDEX "eap_agent_collaborations_to_agent_id_idx" ON "eap_agent_collaborations"("to_agent_id");

CREATE TABLE "eap_agent_audit_logs" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "agent_id"    TEXT        NOT NULL,
  "action"      TEXT        NOT NULL,
  "entity_type" TEXT,
  "entity_id"   TEXT,
  "summary"     TEXT        NOT NULL,
  "cost"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata"    JSONB       NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eap_agent_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eap_agent_audit_logs_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eap_agent_audit_logs_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "eap_agents"("id") ON DELETE CASCADE
);
CREATE INDEX "eap_agent_audit_logs_tenant_id_idx" ON "eap_agent_audit_logs"("tenant_id");
CREATE INDEX "eap_agent_audit_logs_agent_id_idx" ON "eap_agent_audit_logs"("agent_id");
