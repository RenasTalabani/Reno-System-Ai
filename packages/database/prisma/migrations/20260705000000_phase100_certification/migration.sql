-- Phase 100: Platform Certification

CREATE TABLE "cert_programs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "level" VARCHAR(30) NOT NULL DEFAULT 'bronze',
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cert_programs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cert_programs_tenant_id_name_key" ON "cert_programs"("tenant_id","name");
CREATE INDEX "cert_programs_tenant_id_idx" ON "cert_programs"("tenant_id");
ALTER TABLE "cert_programs" ADD CONSTRAINT "cert_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cert_criteria" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "domain" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 10,
  "auto_check" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cert_criteria_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cert_criteria_tenant_id_program_id_idx" ON "cert_criteria"("tenant_id","program_id");
ALTER TABLE "cert_criteria" ADD CONSTRAINT "cert_criteria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cert_criteria" ADD CONSTRAINT "cert_criteria_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "cert_programs"("id") ON DELETE CASCADE;

CREATE TABLE "cert_assessments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'in-progress',
  "overall_score" DOUBLE PRECISION,
  "domain_scores" JSONB,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "run_by" VARCHAR(100),
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cert_assessments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cert_assessments_tenant_id_program_id_idx" ON "cert_assessments"("tenant_id","program_id");
ALTER TABLE "cert_assessments" ADD CONSTRAINT "cert_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cert_assessments" ADD CONSTRAINT "cert_assessments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "cert_programs"("id") ON DELETE CASCADE;

CREATE TABLE "cert_certificates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "assessment_id" UUID NOT NULL,
  "cert_number" VARCHAR(50) NOT NULL,
  "level" VARCHAR(30) NOT NULL,
  "issued_to" VARCHAR(150) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cert_certificates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cert_certificates_tenant_id_cert_number_key" ON "cert_certificates"("tenant_id","cert_number");
CREATE INDEX "cert_certificates_tenant_id_idx" ON "cert_certificates"("tenant_id");
ALTER TABLE "cert_certificates" ADD CONSTRAINT "cert_certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cert_certificates" ADD CONSTRAINT "cert_certificates_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "cert_assessments"("id") ON DELETE CASCADE;

CREATE TABLE "cert_badges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "domain" VARCHAR(50) NOT NULL,
  "earned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cert_badges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cert_badges_tenant_id_idx" ON "cert_badges"("tenant_id");
ALTER TABLE "cert_badges" ADD CONSTRAINT "cert_badges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cert_audit_trails" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "actor" VARCHAR(100) NOT NULL,
  "detail" VARCHAR(500),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cert_audit_trails_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cert_audit_trails_tenant_id_idx" ON "cert_audit_trails"("tenant_id");
ALTER TABLE "cert_audit_trails" ADD CONSTRAINT "cert_audit_trails_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;