-- Phase 43: Advanced Report Builder

CREATE TABLE "rpt_reports" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "description"   TEXT,
  "module"        VARCHAR(50) NOT NULL,
  "query_config"  JSONB       NOT NULL DEFAULT '{}',
  "columns"       JSONB       NOT NULL DEFAULT '[]',
  "filters"       JSONB       NOT NULL DEFAULT '[]',
  "sort"          JSONB       NOT NULL DEFAULT '[]',
  "groupBy"       JSONB       NOT NULL DEFAULT '[]',
  "chart_type"    VARCHAR(30),
  "chart_config"  JSONB,
  "is_public"     BOOLEAN     NOT NULL DEFAULT false,
  "is_pinned"     BOOLEAN     NOT NULL DEFAULT false,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"    TIMESTAMPTZ,
  CONSTRAINT "rpt_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rpt_reports_tenant_module_idx" ON "rpt_reports"("tenant_id", "module");
CREATE INDEX "rpt_reports_tenant_created_idx" ON "rpt_reports"("tenant_id", "created_at" DESC);
ALTER TABLE "rpt_reports" ADD CONSTRAINT "rpt_reports_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "rpt_schedules" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "report_id"     UUID        NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "cron"          VARCHAR(100) NOT NULL,
  "format"        VARCHAR(10) NOT NULL DEFAULT 'csv',
  "recipients"    JSONB       NOT NULL DEFAULT '[]',
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "last_run_at"   TIMESTAMPTZ,
  "next_run_at"   TIMESTAMPTZ,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "rpt_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rpt_schedules_tenant_active_idx" ON "rpt_schedules"("tenant_id", "is_active");
CREATE INDEX "rpt_schedules_next_run_idx" ON "rpt_schedules"("next_run_at") WHERE "is_active" = true;
ALTER TABLE "rpt_schedules" ADD CONSTRAINT "rpt_schedules_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "rpt_schedules" ADD CONSTRAINT "rpt_schedules_report_fkey"
  FOREIGN KEY ("report_id") REFERENCES "rpt_reports"("id") ON DELETE CASCADE;

CREATE TABLE "rpt_exports" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "report_id"   UUID,
  "format"      VARCHAR(10) NOT NULL DEFAULT 'csv',
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "row_count"   INTEGER,
  "file_url"    TEXT,
  "error"       TEXT,
  "requested_by" UUID,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "rpt_exports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rpt_exports_tenant_created_idx" ON "rpt_exports"("tenant_id", "created_at" DESC);
ALTER TABLE "rpt_exports" ADD CONSTRAINT "rpt_exports_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
