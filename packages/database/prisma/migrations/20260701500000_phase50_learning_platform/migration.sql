-- Phase 50: AI Continuous Learning & Optimization Platform
-- Creates: acl_learning_events, acl_tool_insights, acl_agent_insights, acl_policy_insights, acl_kg_feedback, acl_evolution_snapshots

CREATE TABLE "acl_learning_events" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID        NOT NULL,
  "event_type"     TEXT        NOT NULL,
  "source_module"  TEXT        NOT NULL,
  "source_id"      TEXT,
  "outcome"        TEXT        NOT NULL DEFAULT 'success',
  "input_context"  JSONB       NOT NULL DEFAULT '{}',
  "output_context" JSONB       NOT NULL DEFAULT '{}',
  "metrics"        JSONB       NOT NULL DEFAULT '{}',
  "feedback"       TEXT,
  "learned_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "acl_learning_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "acl_learning_events_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "acl_learning_events_tenant_id_idx"   ON "acl_learning_events"("tenant_id");
CREATE INDEX "acl_learning_events_type_idx"        ON "acl_learning_events"("tenant_id","event_type");
CREATE INDEX "acl_learning_events_module_idx"      ON "acl_learning_events"("tenant_id","source_module");

CREATE TABLE "acl_tool_insights" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "tool_id"      UUID        NOT NULL,
  "insight_type" TEXT        NOT NULL,
  "severity"     TEXT        NOT NULL DEFAULT 'info',
  "title"        TEXT        NOT NULL,
  "description"  TEXT        NOT NULL,
  "suggestions"  JSONB       NOT NULL DEFAULT '[]',
  "metrics"      JSONB       NOT NULL DEFAULT '{}',
  "status"       TEXT        NOT NULL DEFAULT 'open',
  "applied_at"   TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "acl_tool_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "acl_tool_insights_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "acl_tool_insights_tool_fk"   FOREIGN KEY ("tool_id")   REFERENCES "ual_tools"("id") ON DELETE CASCADE
);
CREATE INDEX "acl_tool_insights_tenant_id_idx" ON "acl_tool_insights"("tenant_id");
CREATE INDEX "acl_tool_insights_tool_id_idx"   ON "acl_tool_insights"("tool_id");

CREATE TABLE "acl_agent_insights" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "agent_id"     TEXT        NOT NULL,
  "insight_type" TEXT        NOT NULL,
  "severity"     TEXT        NOT NULL DEFAULT 'info',
  "title"        TEXT        NOT NULL,
  "description"  TEXT        NOT NULL,
  "suggestions"  JSONB       NOT NULL DEFAULT '[]',
  "metrics"      JSONB       NOT NULL DEFAULT '{}',
  "status"       TEXT        NOT NULL DEFAULT 'open',
  "applied_at"   TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "acl_agent_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "acl_agent_insights_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "acl_agent_insights_tenant_id_idx" ON "acl_agent_insights"("tenant_id");
CREATE INDEX "acl_agent_insights_agent_id_idx"  ON "acl_agent_insights"("tenant_id","agent_id");

CREATE TABLE "acl_policy_insights" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID        NOT NULL,
  "insight_type"      TEXT        NOT NULL,
  "severity"          TEXT        NOT NULL DEFAULT 'info',
  "title"             TEXT        NOT NULL,
  "description"       TEXT        NOT NULL,
  "affected_policies" JSONB       NOT NULL DEFAULT '[]',
  "suggestion"        TEXT        NOT NULL,
  "status"            TEXT        NOT NULL DEFAULT 'open',
  "resolved_at"       TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "acl_policy_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "acl_policy_insights_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "acl_policy_insights_tenant_id_idx" ON "acl_policy_insights"("tenant_id");

CREATE TABLE "acl_kg_feedback" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "feedback_type" TEXT        NOT NULL,
  "source_module" TEXT        NOT NULL,
  "proposed_data" JSONB       NOT NULL DEFAULT '{}',
  "confidence"    INTEGER     NOT NULL DEFAULT 0,
  "status"        TEXT        NOT NULL DEFAULT 'pending',
  "reviewed_by"   UUID,
  "review_note"   TEXT,
  "reviewed_at"   TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "acl_kg_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "acl_kg_feedback_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "acl_kg_feedback_tenant_id_idx"     ON "acl_kg_feedback"("tenant_id");
CREATE INDEX "acl_kg_feedback_tenant_status_idx" ON "acl_kg_feedback"("tenant_id","status");

CREATE TABLE "acl_evolution_snapshots" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID        NOT NULL,
  "snapshot_date"  DATE        NOT NULL,
  "period"         TEXT        NOT NULL DEFAULT 'daily',
  "tool_metrics"   JSONB       NOT NULL DEFAULT '{}',
  "agent_metrics"  JSONB       NOT NULL DEFAULT '{}',
  "kg_metrics"     JSONB       NOT NULL DEFAULT '{}',
  "policy_metrics" JSONB       NOT NULL DEFAULT '{}',
  "overall_score"  INTEGER,
  "trend"          TEXT,
  "notes"          TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "acl_evolution_snapshots_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "acl_evolution_snapshots_tenant_date_period" UNIQUE ("tenant_id","snapshot_date","period"),
  CONSTRAINT "acl_evolution_snapshots_tenant_fk"         FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "acl_evolution_snapshots_tenant_id_idx" ON "acl_evolution_snapshots"("tenant_id");