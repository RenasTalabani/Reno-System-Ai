-- Phase 70: AI Automation Studio
CREATE TABLE "ai_studio_workflows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "created_by" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL, "description" TEXT, "trigger" JSONB NOT NULL,
  "nodes" JSONB NOT NULL DEFAULT '[]', "edges" JSONB NOT NULL DEFAULT '[]',
  "variables" JSONB NOT NULL DEFAULT '{}', "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1, "is_active" BOOLEAN NOT NULL DEFAULT false,
  "last_run_at" TIMESTAMPTZ, "run_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_studio_workflows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_studio_workflows_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "ai_studio_workflows_tenant_status_idx" ON "ai_studio_workflows"("tenant_id","status");

CREATE TABLE "ai_studio_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "workflow_id" UUID NOT NULL,
  "triggered_by" UUID, "status" VARCHAR(20) NOT NULL DEFAULT 'running',
  "input" JSONB NOT NULL DEFAULT '{}', "output" JSONB NOT NULL DEFAULT '{}',
  "steps" JSONB NOT NULL DEFAULT '[]', "error" TEXT,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "finished_at" TIMESTAMPTZ, "duration_ms" INTEGER,
  CONSTRAINT "ai_studio_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_studio_runs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "ai_studio_runs_workflow_fkey" FOREIGN KEY ("workflow_id") REFERENCES "ai_studio_workflows"("id")
);
CREATE INDEX "ai_studio_runs_tenant_workflow_idx" ON "ai_studio_runs"("tenant_id","workflow_id");
CREATE INDEX "ai_studio_runs_tenant_status_idx" ON "ai_studio_runs"("tenant_id","status");
