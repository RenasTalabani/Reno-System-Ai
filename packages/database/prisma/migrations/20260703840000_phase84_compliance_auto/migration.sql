-- Phase 84: Compliance Automation

CREATE TABLE "ca_frameworks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
  "description" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ca_frameworks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ca_frameworks_tenant_id_code_key" ON "ca_frameworks"("tenant_id","code");
CREATE INDEX "ca_frameworks_tenant_id_idx" ON "ca_frameworks"("tenant_id");
ALTER TABLE "ca_frameworks" ADD CONSTRAINT "ca_frameworks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ca_controls" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "framework_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL DEFAULT 'technical',
  "status" VARCHAR(30) NOT NULL DEFAULT 'not-implemented',
  "automated" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ca_controls_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ca_controls_tenant_id_framework_id_idx" ON "ca_controls"("tenant_id","framework_id");
ALTER TABLE "ca_controls" ADD CONSTRAINT "ca_controls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ca_controls" ADD CONSTRAINT "ca_controls_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "ca_frameworks"("id") ON DELETE CASCADE;

CREATE TABLE "ca_assessments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "framework_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'in-progress',
  "score" DOUBLE PRECISION,
  "total_controls" INTEGER NOT NULL DEFAULT 0,
  "passed_controls" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ca_assessments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ca_assessments_tenant_id_framework_id_idx" ON "ca_assessments"("tenant_id","framework_id");
ALTER TABLE "ca_assessments" ADD CONSTRAINT "ca_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ca_assessments" ADD CONSTRAINT "ca_assessments_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "ca_frameworks"("id") ON DELETE CASCADE;

CREATE TABLE "ca_evidences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "control_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "evidence_type" VARCHAR(30) NOT NULL DEFAULT 'document',
  "content" TEXT,
  "collected_by" VARCHAR(100),
  "valid_until" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ca_evidences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ca_evidences_tenant_id_control_id_idx" ON "ca_evidences"("tenant_id","control_id");
ALTER TABLE "ca_evidences" ADD CONSTRAINT "ca_evidences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ca_evidences" ADD CONSTRAINT "ca_evidences_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "ca_controls"("id") ON DELETE CASCADE;

CREATE TABLE "ca_findings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "control_id" UUID NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "remediation" TEXT,
  "due_date" TIMESTAMPTZ,
  "resolved_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ca_findings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ca_findings_tenant_id_control_id_idx" ON "ca_findings"("tenant_id","control_id");
ALTER TABLE "ca_findings" ADD CONSTRAINT "ca_findings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ca_findings" ADD CONSTRAINT "ca_findings_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "ca_controls"("id") ON DELETE CASCADE;

CREATE TABLE "ca_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "task_type" VARCHAR(30) NOT NULL DEFAULT 'remediation',
  "assignee" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'todo',
  "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "due_date" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ca_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ca_tasks_tenant_id_idx" ON "ca_tasks"("tenant_id");
ALTER TABLE "ca_tasks" ADD CONSTRAINT "ca_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;