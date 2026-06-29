-- Phase 64: Quality Management System
CREATE TABLE "qms_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "title" VARCHAR(400) NOT NULL,
  "type" VARCHAR(50) NOT NULL DEFAULT 'internal', "standard" VARCHAR(100), "status" VARCHAR(30) NOT NULL DEFAULT 'planned',
  "scheduled_at" TIMESTAMPTZ NOT NULL, "completed_at" TIMESTAMPTZ, "lead_auditor" UUID, "scope" TEXT,
  "findings" JSONB NOT NULL DEFAULT '[]', "score" INTEGER, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qms_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "qms_audits_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "qms_audits_tenant_status_idx" ON "qms_audits"("tenant_id","status");

CREATE TABLE "qms_non_conformances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "audit_id" UUID,
  "title" VARCHAR(400) NOT NULL, "description" TEXT NOT NULL, "severity" VARCHAR(20) NOT NULL DEFAULT 'minor',
  "status" VARCHAR(30) NOT NULL DEFAULT 'open', "root_cause" TEXT, "correction" TEXT,
  "due_date" TIMESTAMPTZ, "closed_at" TIMESTAMPTZ, "assigned_to" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qms_nc_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "qms_nc_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "qms_nc_audit_fkey" FOREIGN KEY ("audit_id") REFERENCES "qms_audits"("id")
);
CREATE INDEX "qms_nc_tenant_status_idx" ON "qms_non_conformances"("tenant_id","status");

CREATE TABLE "qms_checklists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" VARCHAR(300) NOT NULL,
  "standard" VARCHAR(100), "items" JSONB NOT NULL DEFAULT '[]', "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "qms_checklists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qms_checklists_tenant_id_idx" ON "qms_checklists"("tenant_id");
