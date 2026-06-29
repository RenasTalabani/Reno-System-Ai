-- Phase 91: CLM 2.0
CREATE TABLE IF NOT EXISTS "clm2_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "body" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "clm2_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clm2_templates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "clm2_templates_tenant_id_idx" ON "clm2_templates"("tenant_id");

CREATE TABLE IF NOT EXISTS "clm2_obligations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contract_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "due_date" DATE,
  "assignee_id" UUID,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "clm2_obligations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "clm2_obligations_contract_idx" ON "clm2_obligations"("contract_id");