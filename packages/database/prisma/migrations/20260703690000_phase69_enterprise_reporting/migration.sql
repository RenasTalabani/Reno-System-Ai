-- Phase 69: Enterprise Reporting & BI Engine
-- 8 tables: ebr_reports, ebr_sections, ebr_templates, ebr_schedules,
--           ebr_export_jobs, ebr_subscriptions, ebr_ai_narratives, ebr_metrics

CREATE TABLE "ebr_reports" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "owner_id"    UUID        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "report_type" TEXT        NOT NULL DEFAULT 'custom',
  "status"      TEXT        NOT NULL DEFAULT 'draft',
  "is_public"   BOOLEAN     NOT NULL DEFAULT false,
  "config"      JSONB       NOT NULL DEFAULT '{}',
  "last_run_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_sections" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "report_id"    UUID        NOT NULL,
  "section_type" TEXT        NOT NULL,
  "sort_order"   INTEGER     NOT NULL DEFAULT 0,
  "title"        TEXT,
  "data_source"  TEXT,
  "config"       JSONB       NOT NULL DEFAULT '{}',
  "cached_data"  JSONB,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_templates" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "category"    TEXT        NOT NULL,
  "is_built_in" BOOLEAN     NOT NULL DEFAULT false,
  "sections"    JSONB       NOT NULL DEFAULT '[]',
  "config"      JSONB       NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_schedules" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "report_id"     UUID        NOT NULL,
  "frequency"     TEXT        NOT NULL DEFAULT 'weekly',
  "cron_expr"     TEXT,
  "recipients"    JSONB       NOT NULL DEFAULT '[]',
  "output_format" TEXT        NOT NULL DEFAULT 'pdf',
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "next_run_at"   TIMESTAMPTZ,
  "last_run_at"   TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_export_jobs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "report_id"    UUID,
  "requested_by" UUID        NOT NULL,
  "format"       TEXT        NOT NULL DEFAULT 'pdf',
  "status"       TEXT        NOT NULL DEFAULT 'done',
  "file_size_kb" INTEGER,
  "error_msg"    TEXT,
  "exported_at"  TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_subscriptions" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID        NOT NULL,
  "report_id"        UUID        NOT NULL,
  "user_id"          UUID        NOT NULL,
  "frequency"        TEXT        NOT NULL DEFAULT 'weekly',
  "is_active"        BOOLEAN     NOT NULL DEFAULT true,
  "last_delivered_at" TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_ai_narratives" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID        NOT NULL,
  "report_id"    UUID        NOT NULL,
  "narrative"    TEXT        NOT NULL,
  "key_insights" JSONB       NOT NULL DEFAULT '[]',
  "confidence"   DOUBLE PRECISION NOT NULL DEFAULT 0.85,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_ai_narratives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ebr_metrics" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "report_id"     UUID        NOT NULL,
  "run_count"     INTEGER     NOT NULL DEFAULT 0,
  "avg_run_ms"    INTEGER     NOT NULL DEFAULT 0,
  "total_exports" INTEGER     NOT NULL DEFAULT 0,
  "view_count"    INTEGER     NOT NULL DEFAULT 0,
  "last_run_at"   TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ebr_metrics_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ebr_reports"       ADD CONSTRAINT "ebr_reports_tenant_id_fkey"        FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_sections"      ADD CONSTRAINT "ebr_sections_report_id_fkey"        FOREIGN KEY ("report_id") REFERENCES "ebr_reports"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_templates"     ADD CONSTRAINT "ebr_templates_tenant_id_fkey"       FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_schedules"     ADD CONSTRAINT "ebr_schedules_tenant_id_fkey"       FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_schedules"     ADD CONSTRAINT "ebr_schedules_report_id_fkey"       FOREIGN KEY ("report_id") REFERENCES "ebr_reports"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_export_jobs"   ADD CONSTRAINT "ebr_export_jobs_tenant_id_fkey"     FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_export_jobs"   ADD CONSTRAINT "ebr_export_jobs_report_id_fkey"     FOREIGN KEY ("report_id") REFERENCES "ebr_reports"("id")   ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ebr_subscriptions" ADD CONSTRAINT "ebr_subscriptions_tenant_id_fkey"   FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_subscriptions" ADD CONSTRAINT "ebr_subscriptions_report_id_fkey"   FOREIGN KEY ("report_id") REFERENCES "ebr_reports"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_ai_narratives" ADD CONSTRAINT "ebr_ai_narratives_tenant_id_fkey"   FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_ai_narratives" ADD CONSTRAINT "ebr_ai_narratives_report_id_fkey"   FOREIGN KEY ("report_id") REFERENCES "ebr_reports"("id")   ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ebr_metrics"       ADD CONSTRAINT "ebr_metrics_report_id_fkey"          FOREIGN KEY ("report_id") REFERENCES "ebr_reports"("id")   ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraints
ALTER TABLE "ebr_schedules"     ADD CONSTRAINT "ebr_schedules_report_id_key"             UNIQUE ("report_id");
ALTER TABLE "ebr_subscriptions" ADD CONSTRAINT "ebr_subscriptions_report_id_user_id_key" UNIQUE ("report_id", "user_id");
ALTER TABLE "ebr_metrics"       ADD CONSTRAINT "ebr_metrics_report_id_key"               UNIQUE ("report_id");

-- Indexes
CREATE INDEX "ebr_reports_tenant_id_idx"                ON "ebr_reports"("tenant_id");
CREATE INDEX "ebr_reports_tenant_id_owner_id_idx"       ON "ebr_reports"("tenant_id", "owner_id");
CREATE INDEX "ebr_sections_report_id_idx"               ON "ebr_sections"("report_id");
CREATE INDEX "ebr_templates_tenant_id_idx"              ON "ebr_templates"("tenant_id");
CREATE INDEX "ebr_schedules_tenant_id_idx"              ON "ebr_schedules"("tenant_id");
CREATE INDEX "ebr_export_jobs_tenant_id_idx"            ON "ebr_export_jobs"("tenant_id");
CREATE INDEX "ebr_export_jobs_report_id_idx"            ON "ebr_export_jobs"("report_id");
CREATE INDEX "ebr_subscriptions_tenant_id_idx"          ON "ebr_subscriptions"("tenant_id");
CREATE INDEX "ebr_ai_narratives_tenant_id_report_id_idx" ON "ebr_ai_narratives"("tenant_id", "report_id");