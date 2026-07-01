-- Phase 40: AI Autonomous Workspace
-- Autonomous long-running jobs with per-step approval,
-- project indexing, semantic search, and discovery engine.

CREATE TABLE "aws_jobs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "user_id"      UUID        NOT NULL,
  "title"        VARCHAR(500) NOT NULL,
  "objective"    TEXT        NOT NULL,
  "project_name" VARCHAR(255),
  "status"       VARCHAR(30)  NOT NULL DEFAULT 'planning',
  "plan"         JSONB       NOT NULL DEFAULT '{}',
  "current_step" INTEGER     NOT NULL DEFAULT 0,
  "total_steps"  INTEGER     NOT NULL DEFAULT 0,
  "can_resume"   BOOLEAN     NOT NULL DEFAULT true,
  "metadata"     JSONB,
  "started_at"   TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "paused_at"    TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aws_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aws_jobs_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aws_jobs_tenant_idx" ON "aws_jobs"("tenant_id");
CREATE INDEX "aws_jobs_tenant_status_idx" ON "aws_jobs"("tenant_id", "status");

CREATE TABLE "aws_job_steps" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "job_id"      UUID        NOT NULL,
  "tenant_id"   UUID        NOT NULL,
  "step_number" INTEGER     NOT NULL,
  "title"       VARCHAR(500) NOT NULL,
  "description" TEXT,
  "tool"        VARCHAR(50)  NOT NULL,
  "payload"     JSONB       NOT NULL DEFAULT '{}',
  "status"      VARCHAR(30)  NOT NULL DEFAULT 'waiting',
  "result"      JSONB,
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "executed_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aws_job_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aws_job_steps_job_fk" FOREIGN KEY ("job_id")
    REFERENCES "aws_jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "aws_job_steps_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "aws_job_steps_tenant_idx" ON "aws_job_steps"("tenant_id");
CREATE INDEX "aws_job_steps_job_idx" ON "aws_job_steps"("job_id");
CREATE INDEX "aws_job_steps_job_status_idx" ON "aws_job_steps"("job_id", "status");

CREATE TABLE "aws_project_index" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "user_id"      UUID         NOT NULL,
  "project_name" VARCHAR(255) NOT NULL,
  "file_path"    VARCHAR(1000) NOT NULL,
  "file_type"    VARCHAR(50)  NOT NULL,
  "summary"      TEXT,
  "keywords"     TEXT[]       NOT NULL DEFAULT '{}',
  "dependencies" TEXT[]       NOT NULL DEFAULT '{}',
  "todos"        JSONB,
  "last_sync_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "aws_project_index_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aws_project_index_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aws_project_index_unique" UNIQUE ("tenant_id", "user_id", "project_name", "file_path")
);
CREATE INDEX "aws_project_index_tenant_idx" ON "aws_project_index"("tenant_id");
CREATE INDEX "aws_project_index_project_idx" ON "aws_project_index"("tenant_id", "project_name");

CREATE TABLE "aws_discoveries" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "user_id"     UUID         NOT NULL,
  "job_id"      UUID,
  "type"        VARCHAR(50)  NOT NULL,
  "severity"    VARCHAR(20)  NOT NULL,
  "title"       VARCHAR(500) NOT NULL,
  "description" TEXT,
  "file_path"   VARCHAR(1000),
  "line_number" INTEGER,
  "status"      VARCHAR(20)  NOT NULL DEFAULT 'open',
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "aws_discoveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "aws_discoveries_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "aws_discoveries_job_fk" FOREIGN KEY ("job_id")
    REFERENCES "aws_jobs"("id") ON DELETE SET NULL
);
CREATE INDEX "aws_discoveries_tenant_idx" ON "aws_discoveries"("tenant_id");
CREATE INDEX "aws_discoveries_tenant_status_idx" ON "aws_discoveries"("tenant_id", "status");
CREATE INDEX "aws_discoveries_tenant_type_idx" ON "aws_discoveries"("tenant_id", "type");
