-- Phase 93: Document OCR & Data Extraction
CREATE TABLE IF NOT EXISTS "ocr_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "filename" VARCHAR(500) NOT NULL,
  "file_url" VARCHAR(1000) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "template" VARCHAR(100),
  "page_count" INTEGER,
  "confidence" DECIMAL(5,4),
  "raw_text" TEXT,
  "error_msg" VARCHAR(1000),
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ocr_jobs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ocr_jobs_tenant_id_idx" ON "ocr_jobs"("tenant_id");

CREATE TABLE IF NOT EXISTS "ocr_fields" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "value" TEXT,
  "confidence" DECIMAL(5,4),
  "bounding_box" JSONB,
  "page_no" INTEGER,
  CONSTRAINT "ocr_fields_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ocr_fields_job_fkey" FOREIGN KEY ("job_id") REFERENCES "ocr_jobs"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ocr_fields_job_idx" ON "ocr_fields"("job_id");