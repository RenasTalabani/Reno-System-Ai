-- Phase 52: AI Process Automation Engine

CREATE TABLE "pae_workflows" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "slug"           TEXT NOT NULL,
  "description"    TEXT,
  "category"       TEXT NOT NULL DEFAULT 'general',
  "status"         TEXT NOT NULL DEFAULT 'draft',
  "version"        INTEGER NOT NULL DEFAULT 1,
  "config"         JSONB NOT NULL DEFAULT '{}',
  "variables"      JSONB NOT NULL DEFAULT '{}',
  "total_runs"     INTEGER NOT NULL DEFAULT 0,
  "successful_runs" INTEGER NOT NULL DEFAULT 0,
  "failed_runs"    INTEGER NOT NULL DEFAULT 0,
  "avg_duration_ms" INTEGER NOT NULL DEFAULT 0,
  "last_run_at"    TIMESTAMPTZ,
  "created_by"     UUID NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"     TIMESTAMPTZ,
  CONSTRAINT "pae_workflows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pae_workflows_tenant_slug_key" ON "pae_workflows"("tenant_id","slug");
CREATE INDEX "pae_workflows_tenant_id_idx" ON "pae_workflows"("tenant_id");
ALTER TABLE "pae_workflows" ADD CONSTRAINT "pae_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "pae_workflow_steps" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL,
  "workflow_id"    UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "step_type"      TEXT NOT NULL,
  "step_order"     INTEGER NOT NULL,
  "config"         JSONB NOT NULL DEFAULT '{}',
  "input_mapping"  JSONB NOT NULL DEFAULT '{}',
  "output_mapping" JSONB NOT NULL DEFAULT '{}',
  "conditions"     JSONB NOT NULL DEFAULT '[]',
  "retry_policy"   JSONB NOT NULL DEFAULT '{}',
  "timeout_ms"     INTEGER,
  "is_enabled"     BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pae_workflow_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pae_workflow_steps_tenant_id_idx" ON "pae_workflow_steps"("tenant_id");
CREATE INDEX "pae_workflow_steps_workflow_id_idx" ON "pae_workflow_steps"("workflow_id");
ALTER TABLE "pae_workflow_steps" ADD CONSTRAINT "pae_workflow_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pae_workflow_steps" ADD CONSTRAINT "pae_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "pae_workflows"("id") ON DELETE CASCADE;

CREATE TABLE "pae_workflow_triggers" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "workflow_id"  UUID NOT NULL,
  "name"         TEXT NOT NULL,
  "trigger_type" TEXT NOT NULL,
  "config"       JSONB NOT NULL DEFAULT '{}',
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "last_fired_at" TIMESTAMPTZ,
  "total_fired"  INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pae_workflow_triggers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pae_workflow_triggers_tenant_id_idx" ON "pae_workflow_triggers"("tenant_id");
CREATE INDEX "pae_workflow_triggers_workflow_id_idx" ON "pae_workflow_triggers"("workflow_id");
ALTER TABLE "pae_workflow_triggers" ADD CONSTRAINT "pae_workflow_triggers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pae_workflow_triggers" ADD CONSTRAINT "pae_workflow_triggers_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "pae_workflows"("id") ON DELETE CASCADE;

CREATE TABLE "pae_workflow_executions" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "workflow_id"  UUID NOT NULL,
  "triggered_by" TEXT NOT NULL,
  "trigger_type" TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'running',
  "input"        JSONB NOT NULL DEFAULT '{}',
  "output"       JSONB NOT NULL DEFAULT '{}',
  "error"        TEXT,
  "current_step" INTEGER NOT NULL DEFAULT 0,
  "total_steps"  INTEGER NOT NULL DEFAULT 0,
  "duration_ms"  INTEGER,
  "started_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "pae_workflow_executions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pae_workflow_executions_tenant_id_idx" ON "pae_workflow_executions"("tenant_id");
CREATE INDEX "pae_workflow_executions_workflow_id_idx" ON "pae_workflow_executions"("workflow_id");
ALTER TABLE "pae_workflow_executions" ADD CONSTRAINT "pae_workflow_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pae_workflow_executions" ADD CONSTRAINT "pae_workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "pae_workflows"("id") ON DELETE CASCADE;

CREATE TABLE "pae_workflow_step_executions" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "execution_id" UUID NOT NULL,
  "step_id"      UUID NOT NULL,
  "step_name"    TEXT NOT NULL,
  "step_order"   INTEGER NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "input"        JSONB NOT NULL DEFAULT '{}',
  "output"       JSONB NOT NULL DEFAULT '{}',
  "error"        TEXT,
  "attempt"      INTEGER NOT NULL DEFAULT 1,
  "duration_ms"  INTEGER,
  "started_at"   TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "pae_workflow_step_executions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pae_workflow_step_executions_tenant_id_idx" ON "pae_workflow_step_executions"("tenant_id");
CREATE INDEX "pae_workflow_step_executions_execution_id_idx" ON "pae_workflow_step_executions"("execution_id");
CREATE INDEX "pae_workflow_step_executions_step_id_idx" ON "pae_workflow_step_executions"("step_id");
ALTER TABLE "pae_workflow_step_executions" ADD CONSTRAINT "pae_workflow_step_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pae_workflow_step_executions" ADD CONSTRAINT "pae_workflow_step_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "pae_workflow_executions"("id") ON DELETE CASCADE;
ALTER TABLE "pae_workflow_step_executions" ADD CONSTRAINT "pae_workflow_step_executions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "pae_workflow_steps"("id") ON DELETE CASCADE;