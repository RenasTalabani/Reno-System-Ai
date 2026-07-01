-- Phase 57: AI Customer Success & Churn Prevention

CREATE TABLE "public"."csp_customers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "external_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'starter',
  "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ltv" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "nps_score" INTEGER,
  "health_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "churn_risk" TEXT NOT NULL DEFAULT 'low',
  "segment" TEXT NOT NULL DEFAULT 'standard',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "last_activity_at" TIMESTAMPTZ,
  "onboarded_at" TIMESTAMPTZ,
  "renewal_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "csp_customers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "csp_customers_tenant_id_idx" ON "public"."csp_customers"("tenant_id");
ALTER TABLE "public"."csp_customers" ADD CONSTRAINT "csp_customers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."csp_health_scores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "overall_score" DOUBLE PRECISION NOT NULL,
  "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "adoption_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "support_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "payment_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "nps_score_factor" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "signals" JSONB NOT NULL DEFAULT '[]',
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "scored_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "csp_health_scores_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "csp_health_scores_tenant_id_idx" ON "public"."csp_health_scores"("tenant_id");
ALTER TABLE "public"."csp_health_scores" ADD CONSTRAINT "csp_health_scores_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."csp_health_scores" ADD CONSTRAINT "csp_health_scores_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "public"."csp_customers"("id") ON DELETE CASCADE;

CREATE TABLE "public"."csp_playbooks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "trigger" TEXT NOT NULL DEFAULT 'manual',
  "steps" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "run_count" INTEGER NOT NULL DEFAULT 0,
  "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "csp_playbooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "csp_playbooks_tenant_id_slug_key" UNIQUE ("tenant_id", "slug")
);
CREATE INDEX "csp_playbooks_tenant_id_idx" ON "public"."csp_playbooks"("tenant_id");
ALTER TABLE "public"."csp_playbooks" ADD CONSTRAINT "csp_playbooks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."csp_playbook_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "playbook_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "steps_run" INTEGER NOT NULL DEFAULT 0,
  "step_results" JSONB NOT NULL DEFAULT '[]',
  "outcome" TEXT,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "csp_playbook_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "csp_playbook_runs_tenant_id_idx" ON "public"."csp_playbook_runs"("tenant_id");
ALTER TABLE "public"."csp_playbook_runs" ADD CONSTRAINT "csp_playbook_runs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."csp_playbook_runs" ADD CONSTRAINT "csp_playbook_runs_playbook_id_fkey"
  FOREIGN KEY ("playbook_id") REFERENCES "public"."csp_playbooks"("id") ON DELETE CASCADE;
ALTER TABLE "public"."csp_playbook_runs" ADD CONSTRAINT "csp_playbook_runs_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "public"."csp_customers"("id") ON DELETE CASCADE;

CREATE TABLE "public"."csp_churn_predictions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "churn_probability" DOUBLE PRECISION NOT NULL,
  "risk_level" TEXT NOT NULL,
  "factors" JSONB NOT NULL DEFAULT '[]',
  "recommendation" TEXT,
  "predicted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "csp_churn_predictions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "csp_churn_predictions_tenant_id_idx" ON "public"."csp_churn_predictions"("tenant_id");
ALTER TABLE "public"."csp_churn_predictions" ADD CONSTRAINT "csp_churn_predictions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."csp_churn_predictions" ADD CONSTRAINT "csp_churn_predictions_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "public"."csp_customers"("id") ON DELETE CASCADE;