-- Phase 53: AI Document Intelligence

CREATE TABLE "adi_documents" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID NOT NULL,
  "name"            TEXT NOT NULL,
  "original_name"   TEXT NOT NULL,
  "mime_type"       TEXT NOT NULL,
  "file_size"       INTEGER NOT NULL,
  "storage_path"    TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'uploaded',
  "language"        TEXT NOT NULL DEFAULT 'en',
  "page_count"      INTEGER NOT NULL DEFAULT 0,
  "word_count"      INTEGER NOT NULL DEFAULT 0,
  "confidence"      FLOAT NOT NULL DEFAULT 0,
  "raw_text"        TEXT,
  "metadata"        JSONB NOT NULL DEFAULT '{}',
  "tags"            JSONB NOT NULL DEFAULT '[]',
  "uploaded_by"     UUID NOT NULL,
  "processed_at"    TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"      TIMESTAMPTZ,
  CONSTRAINT "adi_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "adi_documents_tenant_id_idx" ON "adi_documents"("tenant_id");
ALTER TABLE "adi_documents" ADD CONSTRAINT "adi_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "adi_extractions" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID NOT NULL,
  "document_id"     UUID NOT NULL,
  "extraction_type" TEXT NOT NULL,
  "field_name"      TEXT NOT NULL,
  "field_value"     TEXT NOT NULL,
  "confidence"      FLOAT NOT NULL DEFAULT 0,
  "page_number"     INTEGER,
  "bounding_box"    JSONB,
  "is_verified"     BOOLEAN NOT NULL DEFAULT FALSE,
  "verified_by"     UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "adi_extractions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "adi_extractions_tenant_id_idx" ON "adi_extractions"("tenant_id");
CREATE INDEX "adi_extractions_document_id_idx" ON "adi_extractions"("document_id");
ALTER TABLE "adi_extractions" ADD CONSTRAINT "adi_extractions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "adi_extractions" ADD CONSTRAINT "adi_extractions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "adi_documents"("id") ON DELETE CASCADE;

CREATE TABLE "adi_classifications" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "document_id"  UUID NOT NULL,
  "category"     TEXT NOT NULL,
  "subcategory"  TEXT,
  "confidence"   FLOAT NOT NULL DEFAULT 0,
  "labels"       JSONB NOT NULL DEFAULT '[]',
  "sentiment"    TEXT,
  "language"     TEXT,
  "is_verified"  BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "adi_classifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "adi_classifications_tenant_id_idx" ON "adi_classifications"("tenant_id");
CREATE INDEX "adi_classifications_document_id_idx" ON "adi_classifications"("document_id");
ALTER TABLE "adi_classifications" ADD CONSTRAINT "adi_classifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "adi_classifications" ADD CONSTRAINT "adi_classifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "adi_documents"("id") ON DELETE CASCADE;

CREATE TABLE "adi_pipelines" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "description"  TEXT,
  "steps"        JSONB NOT NULL DEFAULT '[]',
  "input_types"  JSONB NOT NULL DEFAULT '[]',
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "total_runs"   INTEGER NOT NULL DEFAULT 0,
  "last_run_at"  TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "adi_pipelines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "adi_pipelines_tenant_slug_key" ON "adi_pipelines"("tenant_id","slug");
CREATE INDEX "adi_pipelines_tenant_id_idx" ON "adi_pipelines"("tenant_id");
ALTER TABLE "adi_pipelines" ADD CONSTRAINT "adi_pipelines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "adi_pipeline_runs" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "pipeline_id"  UUID NOT NULL,
  "document_id"  UUID,
  "status"       TEXT NOT NULL DEFAULT 'running',
  "output"       JSONB NOT NULL DEFAULT '{}',
  "error"        TEXT,
  "duration_ms"  INTEGER,
  "started_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "adi_pipeline_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "adi_pipeline_runs_tenant_id_idx" ON "adi_pipeline_runs"("tenant_id");
CREATE INDEX "adi_pipeline_runs_pipeline_id_idx" ON "adi_pipeline_runs"("pipeline_id");
ALTER TABLE "adi_pipeline_runs" ADD CONSTRAINT "adi_pipeline_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "adi_pipeline_runs" ADD CONSTRAINT "adi_pipeline_runs_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "adi_pipelines"("id") ON DELETE CASCADE;