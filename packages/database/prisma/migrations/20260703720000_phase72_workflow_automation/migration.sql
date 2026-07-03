-- Phase 72: Workflow Automation Designer
-- Models: WfaWorkflow, WfaStep, WfaExecution, WfaStepLog, WfaWebhook, WfaSchedule

CREATE TABLE "wfa_workflows" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID         NOT NULL,
  "created_by"     UUID         NOT NULL,
  "name"           VARCHAR(255) NOT NULL,
  "description"    TEXT,
  "category"       VARCHAR(100) NOT NULL DEFAULT 'general',
  "trigger_type"   VARCHAR(100) NOT NULL,
  "trigger_config" JSONB        NOT NULL DEFAULT '{}',
  "canvas"         JSONB        NOT NULL DEFAULT '{}',
  "variables"      JSONB        NOT NULL DEFAULT '[]',
  "is_active"      BOOLEAN      NOT NULL DEFAULT TRUE,
  "version"        INTEGER      NOT NULL DEFAULT 1,
  "run_count"      INTEGER      NOT NULL DEFAULT 0,
  "last_run_at"    TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wfa_workflows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wfa_workflows_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "wfa_workflows_tenant_idx"         ON "wfa_workflows" ("tenant_id");
CREATE INDEX "wfa_workflows_tenant_trigger_idx" ON "wfa_workflows" ("tenant_id", "trigger_type");

CREATE TABLE "wfa_steps" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "workflow_id" UUID         NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "step_type"   VARCHAR(100) NOT NULL,
  "config"      JSONB        NOT NULL DEFAULT '{}',
  "position"    JSONB        NOT NULL DEFAULT '{"x":0,"y":0}',
  "order"       INTEGER      NOT NULL DEFAULT 0,
  "next_steps"  JSONB        NOT NULL DEFAULT '[]',
  "is_enabled"  BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wfa_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wfa_steps_tenant_fk"   FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")  ON DELETE CASCADE,
  CONSTRAINT "wfa_steps_workflow_fk" FOREIGN KEY ("workflow_id") REFERENCES "wfa_workflows"("id") ON DELETE CASCADE
);
CREATE INDEX "wfa_steps_tenant_idx"   ON "wfa_steps" ("tenant_id");
CREATE INDEX "wfa_steps_workflow_idx" ON "wfa_steps" ("workflow_id");

CREATE TABLE "wfa_executions" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "workflow_id"  UUID        NOT NULL,
  "triggered_by" UUID,
  "trigger_data" JSONB       NOT NULL DEFAULT '{}',
  "status"       VARCHAR(20) NOT NULL DEFAULT 'running',
  "input"        JSONB       NOT NULL DEFAULT '{}',
  "output"       JSONB       NOT NULL DEFAULT '{}',
  "error"        TEXT,
  "steps_total"  INTEGER     NOT NULL DEFAULT 0,
  "steps_done"   INTEGER     NOT NULL DEFAULT 0,
  "started_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ,
  "duration_ms"  INTEGER,

  CONSTRAINT "wfa_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wfa_executions_tenant_fk"   FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")  ON DELETE CASCADE,
  CONSTRAINT "wfa_executions_workflow_fk" FOREIGN KEY ("workflow_id") REFERENCES "wfa_workflows"("id") ON DELETE CASCADE
);
CREATE INDEX "wfa_executions_tenant_idx"          ON "wfa_executions" ("tenant_id");
CREATE INDEX "wfa_executions_tenant_workflow_idx" ON "wfa_executions" ("tenant_id", "workflow_id");
CREATE INDEX "wfa_executions_tenant_status_idx"   ON "wfa_executions" ("tenant_id", "status");

CREATE TABLE "wfa_step_logs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "execution_id" UUID        NOT NULL,
  "step_id"      UUID        NOT NULL,
  "status"       VARCHAR(20) NOT NULL,
  "input"        JSONB       NOT NULL DEFAULT '{}',
  "output"       JSONB       NOT NULL DEFAULT '{}',
  "error"        TEXT,
  "duration_ms"  INTEGER,
  "executed_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wfa_step_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wfa_step_logs_tenant_fk"    FOREIGN KEY ("tenant_id")    REFERENCES "core_tenants"("id")   ON DELETE CASCADE,
  CONSTRAINT "wfa_step_logs_exec_fk"      FOREIGN KEY ("execution_id") REFERENCES "wfa_executions"("id") ON DELETE CASCADE,
  CONSTRAINT "wfa_step_logs_step_fk"      FOREIGN KEY ("step_id")      REFERENCES "wfa_steps"("id")      ON DELETE CASCADE
);
CREATE INDEX "wfa_step_logs_tenant_idx" ON "wfa_step_logs" ("tenant_id");
CREATE INDEX "wfa_step_logs_exec_idx"   ON "wfa_step_logs" ("execution_id");

CREATE TABLE "wfa_webhooks" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "workflow_id" UUID         NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "token"       VARCHAR(128) NOT NULL UNIQUE,
  "method"      VARCHAR(10)  NOT NULL DEFAULT 'POST',
  "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "last_used_at" TIMESTAMPTZ,
  "hit_count"   INTEGER      NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wfa_webhooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wfa_webhooks_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "wfa_webhooks_tenant_idx" ON "wfa_webhooks" ("tenant_id");
CREATE INDEX "wfa_webhooks_token_idx"  ON "wfa_webhooks" ("token");

CREATE TABLE "wfa_schedules" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "workflow_id" UUID         NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "cron_expr"   VARCHAR(100) NOT NULL,
  "timezone"    VARCHAR(50)  NOT NULL DEFAULT 'UTC',
  "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "next_run_at" TIMESTAMPTZ,
  "last_run_at" TIMESTAMPTZ,
  "run_count"   INTEGER      NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wfa_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wfa_schedules_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "wfa_schedules_tenant_idx"          ON "wfa_schedules" ("tenant_id");
CREATE INDEX "wfa_schedules_tenant_workflow_idx" ON "wfa_schedules" ("tenant_id", "workflow_id");