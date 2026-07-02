-- Phase 60: AI Financial Intelligence & Cash Flow Optimizer

CREATE TABLE "public"."fi_ledgers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "description" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "budgeted" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "type" TEXT NOT NULL DEFAULT 'actual',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "entry_date" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fi_ledgers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fi_ledgers_tenant_id_period_idx" ON "public"."fi_ledgers"("tenant_id","period");
ALTER TABLE "public"."fi_ledgers" ADD CONSTRAINT "fi_ledgers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."fi_budget_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "budgeted" DOUBLE PRECISION NOT NULL,
  "actual" DOUBLE PRECISION NOT NULL,
  "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "variance_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "ai_suggestion" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fi_budget_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fi_budget_alerts_tenant_id_idx" ON "public"."fi_budget_alerts"("tenant_id");
ALTER TABLE "public"."fi_budget_alerts" ADD CONSTRAINT "fi_budget_alerts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."fi_cash_forecasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "forecast_type" TEXT NOT NULL DEFAULT 'monthly',
  "inflows" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "outflows" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "net_cash_flow" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "opening_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "closing_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_adjusted" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "ai_summary" TEXT,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fi_cash_forecasts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fi_cash_forecasts_tenant_period_type_key" UNIQUE ("tenant_id", "period", "forecast_type")
);
CREATE INDEX "fi_cash_forecasts_tenant_id_idx" ON "public"."fi_cash_forecasts"("tenant_id");
ALTER TABLE "public"."fi_cash_forecasts" ADD CONSTRAINT "fi_cash_forecasts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "public"."fi_financial_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "impact" DOUBLE PRECISION,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "data" JSONB NOT NULL DEFAULT '{}',
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fi_financial_insights_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fi_financial_insights_tenant_id_idx" ON "public"."fi_financial_insights"("tenant_id");
ALTER TABLE "public"."fi_financial_insights" ADD CONSTRAINT "fi_financial_insights_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."core_tenants"("id") ON DELETE CASCADE;