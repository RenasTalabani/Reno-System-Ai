-- Phase 62: Advanced Reporting Engine (IF NOT EXISTS guards for idempotency)
CREATE TABLE IF NOT EXISTS "rpt_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(50) NOT NULL DEFAULT 'table',
  "data_source" VARCHAR(100) NOT NULL,
  "query" JSONB NOT NULL,
  "columns" JSONB NOT NULL DEFAULT '[]',
  "filters" JSONB NOT NULL DEFAULT '[]',
  "sort_by" JSONB NOT NULL DEFAULT '[]',
  "group_by" JSONB NOT NULL DEFAULT '[]',
  "chart_config" JSONB NOT NULL DEFAULT '{}',
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "is_template" BOOLEAN NOT NULL DEFAULT false,
  "last_run_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rpt_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rpt_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "rpt_reports_tenant_id_idx" ON "rpt_reports"("tenant_id");

CREATE TABLE IF NOT EXISTS "rpt_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "cron" VARCHAR(100) NOT NULL,
  "format" VARCHAR(20) NOT NULL DEFAULT 'pdf',
  "recipients" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_run_at" TIMESTAMPTZ,
  "next_run_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rpt_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rpt_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "rpt_schedules_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "rpt_reports"("id") ON DELETE CASCADE
);
CREATE INDEX "rpt_schedules_tenant_id_idx" ON "rpt_schedules"("tenant_id");

CREATE TABLE IF NOT EXISTS "rpt_exports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "report_id" UUID NOT NULL,
  "format" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "file_url" VARCHAR(1000),
  "row_count" INTEGER,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "rpt_exports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rpt_exports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "rpt_reports"("id") ON DELETE CASCADE
);
CREATE INDEX "rpt_exports_report_id_idx" ON "rpt_exports"("report_id");
