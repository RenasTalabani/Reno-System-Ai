-- Phase 58: AI Sales Intelligence & Pipeline Optimizer

CREATE TABLE "public"."si_deals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "contact_name" TEXT NOT NULL,
  "company" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'prospecting',
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_probability" DOUBLE PRECISION,
  "expected_close_at" TIMESTAMPTZ,
  "closed_at" TIMESTAMPTZ,
  "owner_id" UUID,
  "source" TEXT NOT NULL DEFAULT 'inbound',
  "lost_reason" TEXT,
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "next_best_action" TEXT,
  "tags" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "si_deals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "si_deals_tenant_id_idx" ON "public"."si_deals"("tenant_id");
ALTER TABLE "public"."si_deals" ADD CONSTRAINT "si_deals_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."si_opportunities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "deal_id" UUID NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'upsell',
  "title" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status" TEXT NOT NULL DEFAULT 'identified',
  "ai_generated" BOOLEAN NOT NULL DEFAULT false,
  "reasoning" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "si_opportunities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "si_opportunities_tenant_id_idx" ON "public"."si_opportunities"("tenant_id");
ALTER TABLE "public"."si_opportunities" ADD CONSTRAINT "si_opportunities_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "public"."si_opportunities" ADD CONSTRAINT "si_opportunities_deal_id_fkey"
  FOREIGN KEY ("deal_id") REFERENCES "public"."si_deals"("id") ON DELETE CASCADE;

CREATE TABLE "public"."si_lead_scores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "contact_id" UUID,
  "contact_name" TEXT NOT NULL,
  "contact_email" TEXT,
  "company" TEXT,
  "overall_score" INTEGER NOT NULL DEFAULT 0,
  "fit_score" INTEGER NOT NULL DEFAULT 0,
  "intent_score" INTEGER NOT NULL DEFAULT 0,
  "engagement_score" INTEGER NOT NULL DEFAULT 0,
  "grade" TEXT NOT NULL DEFAULT 'C',
  "signals" JSONB NOT NULL DEFAULT '[]',
  "recommendation" TEXT,
  "scored_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "si_lead_scores_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "si_lead_scores_tenant_id_idx" ON "public"."si_lead_scores"("tenant_id");
ALTER TABLE "public"."si_lead_scores" ADD CONSTRAINT "si_lead_scores_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."si_sales_forecasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "forecast_type" TEXT NOT NULL DEFAULT 'monthly',
  "committed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "best_case" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pipeline" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_adjusted" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_summary" TEXT,
  "deal_count" INTEGER NOT NULL DEFAULT 0,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "si_sales_forecasts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "si_sales_forecasts_tenant_period_type_key" UNIQUE ("tenant_id", "period", "forecast_type")
);
CREATE INDEX "si_sales_forecasts_tenant_id_idx" ON "public"."si_sales_forecasts"("tenant_id");
ALTER TABLE "public"."si_sales_forecasts" ADD CONSTRAINT "si_sales_forecasts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;