-- Phase 94: AI Compliance

CREATE TABLE "ac_regulations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "jurisdiction" VARCHAR(50) NOT NULL DEFAULT 'EU',
  "risk_category" VARCHAR(30) NOT NULL DEFAULT 'limited',
  "description" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ac_regulations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ac_regulations_tenant_id_code_key" ON "ac_regulations"("tenant_id","code");
CREATE INDEX "ac_regulations_tenant_id_idx" ON "ac_regulations"("tenant_id");
ALTER TABLE "ac_regulations" ADD CONSTRAINT "ac_regulations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ac_requirements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "regulation_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "compliance_status" VARCHAR(30) NOT NULL DEFAULT 'not-assessed',
  "evidence" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ac_requirements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ac_requirements_tenant_id_regulation_id_idx" ON "ac_requirements"("tenant_id","regulation_id");
ALTER TABLE "ac_requirements" ADD CONSTRAINT "ac_requirements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ac_requirements" ADD CONSTRAINT "ac_requirements_regulation_id_fkey" FOREIGN KEY ("regulation_id") REFERENCES "ac_regulations"("id") ON DELETE CASCADE;

CREATE TABLE "ac_assessments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "system_name" VARCHAR(100) NOT NULL,
  "assessment_type" VARCHAR(30) NOT NULL DEFAULT 'conformity',
  "risk_level" VARCHAR(30) NOT NULL DEFAULT 'limited',
  "score" DOUBLE PRECISION,
  "status" VARCHAR(30) NOT NULL DEFAULT 'in-progress',
  "findings" JSONB,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ac_assessments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ac_assessments_tenant_id_idx" ON "ac_assessments"("tenant_id");
ALTER TABLE "ac_assessments" ADD CONSTRAINT "ac_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ac_data_processings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "activity_name" VARCHAR(150) NOT NULL,
  "purpose" TEXT NOT NULL,
  "legal_basis" VARCHAR(50) NOT NULL DEFAULT 'consent',
  "data_categories" JSONB,
  "retention_days" INTEGER NOT NULL DEFAULT 365,
  "is_high_risk" BOOLEAN NOT NULL DEFAULT false,
  "dpia_completed" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ac_data_processings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ac_data_processings_tenant_id_idx" ON "ac_data_processings"("tenant_id");
ALTER TABLE "ac_data_processings" ADD CONSTRAINT "ac_data_processings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ac_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "subject_ref" VARCHAR(100) NOT NULL,
  "purpose" VARCHAR(255) NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "granted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revoked_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ac_consents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ac_consents_tenant_id_subject_ref_idx" ON "ac_consents"("tenant_id","subject_ref");
ALTER TABLE "ac_consents" ADD CONSTRAINT "ac_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ac_audit_trails" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "event_type" VARCHAR(50) NOT NULL,
  "system_ref" VARCHAR(100),
  "actor" VARCHAR(100) NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ac_audit_trails_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ac_audit_trails_tenant_id_event_type_idx" ON "ac_audit_trails"("tenant_id","event_type");
ALTER TABLE "ac_audit_trails" ADD CONSTRAINT "ac_audit_trails_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;