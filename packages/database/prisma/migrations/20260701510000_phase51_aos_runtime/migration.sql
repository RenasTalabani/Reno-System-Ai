-- Phase 51: AI Enterprise Operating System Runtime
-- Creates: aos_runtimes, aos_events, aos_jobs, aos_job_executions, aos_resource_usage, aos_hooks

CREATE TABLE "aos_runtimes" (
  "id"                    UUID              NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID              NOT NULL,
  "name"                  TEXT              NOT NULL,
  "slug"                  TEXT              NOT NULL,
  "description"           TEXT,
  "status"                TEXT              NOT NULL DEFAULT 'running',
  "config"                JSONB             NOT NULL DEFAULT '{}',
  "max_concurrent_agents" INTEGER           NOT NULL DEFAULT 10,
  "max_tokens_per_hour"   INTEGER,
  "max_cost_per_day"      DOUBLE PRECISION,
  "total_events_processed" INTEGER          NOT NULL DEFAULT 0,
  "total_jobs_run"        INTEGER           NOT NULL DEFAULT 0,
  "uptime_seconds"        INTEGER           NOT NULL DEFAULT 0,
  "started_at"            TIMESTAMPTZ,
  "created_at"            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "aos_runtimes_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "aos_runtimes_tenant_slug_key" UNIQUE ("tenant_id","slug"),
  CONSTRAINT "aos_runtimes_tenant_fk"       FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aos_runtimes_tenant_id_idx" ON "aos_runtimes"("tenant_id");

CREATE TABLE "aos_events" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "runtime_id"   UUID,
  "channel"      TEXT        NOT NULL,
  "source_type"  TEXT        NOT NULL,
  "source_id"    TEXT,
  "payload"      JSONB       NOT NULL DEFAULT '{}',
  "priority"     TEXT        NOT NULL DEFAULT 'normal',
  "status"       TEXT        NOT NULL DEFAULT 'published',
  "consumers"    INTEGER     NOT NULL DEFAULT 0,
  "processed_at" TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aos_events_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "aos_events_tenant_fk" FOREIGN KEY ("tenant_id")  REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aos_events_runtime_fk" FOREIGN KEY ("runtime_id") REFERENCES "aos_runtimes"("id") ON DELETE SET NULL
);
CREATE INDEX "aos_events_tenant_id_idx" ON "aos_events"("tenant_id");
CREATE INDEX "aos_events_channel_idx"   ON "aos_events"("tenant_id","channel");
CREATE INDEX "aos_events_status_idx"    ON "aos_events"("tenant_id","status");

CREATE TABLE "aos_jobs" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "runtime_id"  UUID,
  "name"        TEXT        NOT NULL,
  "slug"        TEXT        NOT NULL,
  "job_type"    TEXT        NOT NULL,
  "schedule"    TEXT,
  "handler"     TEXT        NOT NULL,
  "params"      JSONB       NOT NULL DEFAULT '{}',
  "priority"    TEXT        NOT NULL DEFAULT 'normal',
  "status"      TEXT        NOT NULL DEFAULT 'active',
  "last_run_at" TIMESTAMPTZ,
  "next_run_at" TIMESTAMPTZ,
  "total_runs"  INTEGER     NOT NULL DEFAULT 0,
  "failed_runs" INTEGER     NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aos_jobs_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "aos_jobs_tenant_slug_key" UNIQUE ("tenant_id","slug"),
  CONSTRAINT "aos_jobs_tenant_fk"       FOREIGN KEY ("tenant_id")  REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aos_jobs_runtime_fk"      FOREIGN KEY ("runtime_id") REFERENCES "aos_runtimes"("id") ON DELETE SET NULL
);
CREATE INDEX "aos_jobs_tenant_id_idx" ON "aos_jobs"("tenant_id");

CREATE TABLE "aos_job_executions" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "job_id"       UUID        NOT NULL,
  "status"       TEXT        NOT NULL DEFAULT 'running',
  "input"        JSONB       NOT NULL DEFAULT '{}',
  "output"       JSONB,
  "error"        TEXT,
  "duration_ms"  INTEGER,
  "started_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "aos_job_executions_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "aos_job_executions_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aos_job_executions_job_fk"    FOREIGN KEY ("job_id")    REFERENCES "aos_jobs"("id")    ON DELETE CASCADE
);
CREATE INDEX "aos_job_executions_tenant_id_idx" ON "aos_job_executions"("tenant_id");
CREATE INDEX "aos_job_executions_job_id_idx"    ON "aos_job_executions"("job_id");

CREATE TABLE "aos_resource_usage" (
  "id"                UUID              NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID              NOT NULL,
  "period"            TEXT              NOT NULL DEFAULT 'hourly',
  "period_at"         TIMESTAMPTZ       NOT NULL,
  "tokens_used"       INTEGER           NOT NULL DEFAULT 0,
  "tool_calls_total"  INTEGER           NOT NULL DEFAULT 0,
  "agent_tasks_total" INTEGER           NOT NULL DEFAULT 0,
  "events_published"  INTEGER           NOT NULL DEFAULT 0,
  "jobs_executed"     INTEGER           NOT NULL DEFAULT 0,
  "total_cost"        DOUBLE PRECISION  NOT NULL DEFAULT 0,
  "budget_used_pct"   DOUBLE PRECISION,
  "alerts"            JSONB             NOT NULL DEFAULT '[]',
  "created_at"        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "aos_resource_usage_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "aos_resource_usage_tenant_period_key" UNIQUE ("tenant_id","period","period_at"),
  CONSTRAINT "aos_resource_usage_tenant_fk"         FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aos_resource_usage_tenant_id_idx" ON "aos_resource_usage"("tenant_id");

CREATE TABLE "aos_hooks" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "name"          TEXT        NOT NULL,
  "slug"          TEXT        NOT NULL,
  "hook_type"     TEXT        NOT NULL,
  "handler"       TEXT        NOT NULL,
  "handler_type"  TEXT        NOT NULL DEFAULT 'internal',
  "conditions"    JSONB       NOT NULL DEFAULT '{}',
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "priority"      INTEGER     NOT NULL DEFAULT 0,
  "total_fired"   INTEGER     NOT NULL DEFAULT 0,
  "last_fired_at" TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aos_hooks_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "aos_hooks_tenant_slug_key" UNIQUE ("tenant_id","slug"),
  CONSTRAINT "aos_hooks_tenant_fk"       FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aos_hooks_tenant_id_idx" ON "aos_hooks"("tenant_id");