-- Phase 47: Data Import/Export Hub

CREATE TABLE "dix_import_jobs" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "entity"        VARCHAR(50) NOT NULL,
  "filename"      VARCHAR(500) NOT NULL,
  "status"        VARCHAR(30) NOT NULL DEFAULT 'pending',
  "total_rows"    INTEGER     NOT NULL DEFAULT 0,
  "processed_rows" INTEGER    NOT NULL DEFAULT 0,
  "success_rows"  INTEGER     NOT NULL DEFAULT 0,
  "error_rows"    INTEGER     NOT NULL DEFAULT 0,
  "errors"        JSONB       NOT NULL DEFAULT '[]',
  "mapping"       JSONB       NOT NULL DEFAULT '{}',
  "started_at"    TIMESTAMPTZ,
  "finished_at"   TIMESTAMPTZ,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dix_import_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dix_import_jobs_tenant_idx" ON "dix_import_jobs"("tenant_id", "created_at" DESC);
ALTER TABLE "dix_import_jobs" ADD CONSTRAINT "dix_import_jobs_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "dix_export_jobs" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "entity"      VARCHAR(50) NOT NULL,
  "format"      VARCHAR(10) NOT NULL DEFAULT 'csv',
  "filters"     JSONB       NOT NULL DEFAULT '{}',
  "columns"     JSONB       NOT NULL DEFAULT '[]',
  "status"      VARCHAR(30) NOT NULL DEFAULT 'pending',
  "row_count"   INTEGER     NOT NULL DEFAULT 0,
  "file_url"    TEXT,
  "created_by"  UUID,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finished_at" TIMESTAMPTZ,
  CONSTRAINT "dix_export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dix_export_jobs_tenant_idx" ON "dix_export_jobs"("tenant_id", "created_at" DESC);
ALTER TABLE "dix_export_jobs" ADD CONSTRAINT "dix_export_jobs_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
