-- Phase 92: AI Governance

CREATE TABLE "aig_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "policy_area" VARCHAR(30) NOT NULL DEFAULT 'usage',
  "rules" JSONB NOT NULL,
  "enforcement" VARCHAR(30) NOT NULL DEFAULT 'advisory',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aig_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aig_policies_tenant_id_idx" ON "aig_policies"("tenant_id");
ALTER TABLE "aig_policies" ADD CONSTRAINT "aig_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "aig_model_registry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_name" VARCHAR(100) NOT NULL,
  "provider" VARCHAR(30) NOT NULL DEFAULT 'reno-brain',
  "risk_tier" VARCHAR(20) NOT NULL DEFAULT 'low',
  "approval_status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "allowed_uses" JSONB,
  "prohibited_uses" JSONB,
  "approved_by" VARCHAR(100),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aig_model_registry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "aig_model_registry_tenant_id_model_name_provider_key" ON "aig_model_registry"("tenant_id","model_name","provider");
CREATE INDEX "aig_model_registry_tenant_id_idx" ON "aig_model_registry"("tenant_id");
ALTER TABLE "aig_model_registry" ADD CONSTRAINT "aig_model_registry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "aig_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "request_type" VARCHAR(30) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "justification" TEXT,
  "requested_by" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "decided_by" VARCHAR(100),
  "decision_note" TEXT,
  "decided_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aig_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aig_approvals_tenant_id_status_idx" ON "aig_approvals"("tenant_id","status");
ALTER TABLE "aig_approvals" ADD CONSTRAINT "aig_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "aig_usage_limits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "scope" VARCHAR(30) NOT NULL DEFAULT 'tenant',
  "scope_ref" VARCHAR(100),
  "limit_type" VARCHAR(30) NOT NULL DEFAULT 'tokens-per-day',
  "limit_value" INTEGER NOT NULL,
  "used_value" INTEGER NOT NULL DEFAULT 0,
  "action" VARCHAR(20) NOT NULL DEFAULT 'warn',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aig_usage_limits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aig_usage_limits_tenant_id_idx" ON "aig_usage_limits"("tenant_id");
ALTER TABLE "aig_usage_limits" ADD CONSTRAINT "aig_usage_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "aig_incidents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "incident_type" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "description" TEXT NOT NULL,
  "model_ref" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "resolution" TEXT,
  "resolved_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aig_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aig_incidents_tenant_id_status_idx" ON "aig_incidents"("tenant_id","status");
ALTER TABLE "aig_incidents" ADD CONSTRAINT "aig_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "aig_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "review_type" VARCHAR(30) NOT NULL DEFAULT 'quarterly',
  "scope" VARCHAR(255) NOT NULL,
  "findings" JSONB,
  "score" DOUBLE PRECISION,
  "reviewer" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'in-progress',
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "aig_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "aig_reviews_tenant_id_idx" ON "aig_reviews"("tenant_id");
ALTER TABLE "aig_reviews" ADD CONSTRAINT "aig_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;