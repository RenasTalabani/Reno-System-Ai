-- Phase 35: Claude Digital Employee Framework
-- Creates: ai_work_tasks, ai_work_steps, ai_work_memory, ai_work_schedules, ai_work_audit_logs

CREATE TABLE "ai_work_tasks" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID          NOT NULL,
  "user_id"         UUID          NOT NULL,
  "provider"        VARCHAR(50)   NOT NULL DEFAULT 'mock',
  "agent_slug"      VARCHAR(100),
  "title"           VARCHAR(500)  NOT NULL,
  "description"     TEXT,
  "request"         TEXT          NOT NULL,
  "status"          VARCHAR(30)   NOT NULL DEFAULT 'draft',
  "risk_level"      VARCHAR(20)   NOT NULL DEFAULT 'low',
  "priority"        VARCHAR(20)   NOT NULL DEFAULT 'normal',
  "module"          VARCHAR(50),
  "plan"            JSONB,
  "result"          JSONB,
  "error_message"   TEXT,
  "progress_pct"    INTEGER       NOT NULL DEFAULT 0,
  "total_steps"     INTEGER       NOT NULL DEFAULT 0,
  "completed_steps" INTEGER       NOT NULL DEFAULT 0,
  "tokens_used"     INTEGER,
  "cost_usd"        DECIMAL(10,6),
  "schedule_id"     UUID,
  "started_at"      TIMESTAMP(3),
  "completed_at"    TIMESTAMP(3),
  "paused_at"       TIMESTAMP(3),
  "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_work_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_work_tasks_tenant_status_idx"   ON "ai_work_tasks"("tenant_id", "status");
CREATE INDEX "ai_work_tasks_tenant_created_idx"  ON "ai_work_tasks"("tenant_id", "created_at" DESC);
CREATE INDEX "ai_work_tasks_tenant_provider_idx" ON "ai_work_tasks"("tenant_id", "provider");

ALTER TABLE "ai_work_tasks"
  ADD CONSTRAINT "ai_work_tasks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ai_work_steps" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID          NOT NULL,
  "task_id"       UUID          NOT NULL,
  "step_index"    INTEGER       NOT NULL,
  "title"         VARCHAR(500)  NOT NULL,
  "description"   TEXT,
  "tool_name"     VARCHAR(100),
  "status"        VARCHAR(20)   NOT NULL DEFAULT 'pending',
  "input"         JSONB,
  "output"        JSONB,
  "proposal_id"   UUID,
  "error_message" TEXT,
  "duration_ms"   INTEGER,
  "started_at"    TIMESTAMP(3),
  "completed_at"  TIMESTAMP(3),
  CONSTRAINT "ai_work_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_work_steps_task_id_idx"   ON "ai_work_steps"("task_id");
CREATE INDEX "ai_work_steps_tenant_id_idx" ON "ai_work_steps"("tenant_id");

ALTER TABLE "ai_work_steps"
  ADD CONSTRAINT "ai_work_steps_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "ai_work_tasks"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "ai_work_memory" (
  "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID          NOT NULL,
  "task_id"    UUID          NOT NULL,
  "key"        VARCHAR(200)  NOT NULL,
  "value"      JSONB         NOT NULL,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_work_memory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_work_memory_task_key_unique" UNIQUE ("task_id", "key")
);

CREATE INDEX "ai_work_memory_task_id_idx"   ON "ai_work_memory"("task_id");
CREATE INDEX "ai_work_memory_tenant_id_idx" ON "ai_work_memory"("tenant_id");

ALTER TABLE "ai_work_memory"
  ADD CONSTRAINT "ai_work_memory_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "ai_work_tasks"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "ai_work_schedules" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID         NOT NULL,
  "user_id"        UUID         NOT NULL,
  "title"          VARCHAR(500) NOT NULL,
  "request"        TEXT         NOT NULL,
  "provider"       VARCHAR(50)  NOT NULL DEFAULT 'mock',
  "agent_slug"     VARCHAR(100),
  "cron_expr"      VARCHAR(100),
  "interval_type"  VARCHAR(20),
  "interval_value" INTEGER,
  "day_of_week"    INTEGER,
  "hour_of_day"    INTEGER,
  "is_enabled"     BOOLEAN      NOT NULL DEFAULT true,
  "last_run_at"    TIMESTAMP(3),
  "next_run_at"    TIMESTAMP(3),
  "run_count"      INTEGER      NOT NULL DEFAULT 0,
  "last_task_id"   UUID,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_work_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_work_schedules_tenant_id_idx"         ON "ai_work_schedules"("tenant_id");
CREATE INDEX "ai_work_schedules_tenant_enabled_idx"    ON "ai_work_schedules"("tenant_id", "is_enabled");
CREATE INDEX "ai_work_schedules_next_run_at_idx"       ON "ai_work_schedules"("next_run_at");

ALTER TABLE "ai_work_schedules"
  ADD CONSTRAINT "ai_work_schedules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ai_work_audit_logs" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "task_id"     UUID,
  "user_id"     UUID,
  "action"      VARCHAR(100) NOT NULL,
  "provider"    VARCHAR(50),
  "details"     JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_work_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_work_audit_logs_tenant_occurred_idx" ON "ai_work_audit_logs"("tenant_id", "occurred_at" DESC);
CREATE INDEX "ai_work_audit_logs_task_id_idx"         ON "ai_work_audit_logs"("task_id");
CREATE INDEX "ai_work_audit_logs_tenant_action_idx"   ON "ai_work_audit_logs"("tenant_id", "action");

ALTER TABLE "ai_work_audit_logs"
  ADD CONSTRAINT "ai_work_audit_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "ai_work_audit_logs"
  ADD CONSTRAINT "ai_work_audit_logs_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "ai_work_tasks"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
