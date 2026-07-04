-- Phase 93: AI Explainability

CREATE TABLE "xai_decisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_ref" VARCHAR(100) NOT NULL,
  "decision_type" VARCHAR(30) NOT NULL DEFAULT 'classification',
  "input_summary" TEXT NOT NULL,
  "outcome" VARCHAR(255) NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "subject_ref" VARCHAR(100),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "xai_decisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "xai_decisions_tenant_id_model_ref_idx" ON "xai_decisions"("tenant_id","model_ref");
ALTER TABLE "xai_decisions" ADD CONSTRAINT "xai_decisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "xai_factors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "decision_id" UUID NOT NULL,
  "feature_name" VARCHAR(100) NOT NULL,
  "contribution" DOUBLE PRECISION NOT NULL,
  "direction" VARCHAR(20) NOT NULL DEFAULT 'positive',
  "value" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "xai_factors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "xai_factors_tenant_id_decision_id_idx" ON "xai_factors"("tenant_id","decision_id");
ALTER TABLE "xai_factors" ADD CONSTRAINT "xai_factors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "xai_factors" ADD CONSTRAINT "xai_factors_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "xai_decisions"("id") ON DELETE CASCADE;

CREATE TABLE "xai_traces" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "decision_id" UUID NOT NULL,
  "step_order" INTEGER NOT NULL,
  "step_name" VARCHAR(100) NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "xai_traces_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "xai_traces_tenant_id_decision_id_idx" ON "xai_traces"("tenant_id","decision_id");
ALTER TABLE "xai_traces" ADD CONSTRAINT "xai_traces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "xai_traces" ADD CONSTRAINT "xai_traces_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "xai_decisions"("id") ON DELETE CASCADE;

CREATE TABLE "xai_counterfactuals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "decision_id" UUID NOT NULL,
  "change" VARCHAR(255) NOT NULL,
  "would_change_outcome" BOOLEAN NOT NULL DEFAULT false,
  "new_outcome" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "xai_counterfactuals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "xai_counterfactuals_tenant_id_decision_id_idx" ON "xai_counterfactuals"("tenant_id","decision_id");
ALTER TABLE "xai_counterfactuals" ADD CONSTRAINT "xai_counterfactuals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "xai_counterfactuals" ADD CONSTRAINT "xai_counterfactuals_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "xai_decisions"("id") ON DELETE CASCADE;

CREATE TABLE "xai_feature_importances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_ref" VARCHAR(100) NOT NULL,
  "feature_name" VARCHAR(100) NOT NULL,
  "importance" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "xai_feature_importances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "xai_feature_importances_tenant_id_model_ref_feature_name_key" ON "xai_feature_importances"("tenant_id","model_ref","feature_name");
CREATE INDEX "xai_feature_importances_tenant_id_model_ref_idx" ON "xai_feature_importances"("tenant_id","model_ref");
ALTER TABLE "xai_feature_importances" ADD CONSTRAINT "xai_feature_importances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "xai_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_ref" VARCHAR(100) NOT NULL,
  "report_type" VARCHAR(30) NOT NULL DEFAULT 'transparency',
  "content" JSONB NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "xai_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "xai_reports_tenant_id_model_ref_idx" ON "xai_reports"("tenant_id","model_ref");
ALTER TABLE "xai_reports" ADD CONSTRAINT "xai_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;