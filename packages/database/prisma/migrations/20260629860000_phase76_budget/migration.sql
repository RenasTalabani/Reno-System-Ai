-- Phase 76: Budget & Forecasting
CREATE TABLE "budget_periods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "total_budget" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "budget_periods_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "budget_periods_tenant_id_idx" ON "budget_periods"("tenant_id");

CREATE TABLE "budget_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period_id" UUID NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "description" VARCHAR(300) NOT NULL,
  "budgeted" DECIMAL(14,2) NOT NULL,
  "actual" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "forecast" DECIMAL(14,2),
  "department" VARCHAR(100),
  "notes" TEXT,
  CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "budget_lines_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "budget_lines_period_fkey" FOREIGN KEY ("period_id") REFERENCES "budget_periods"("id")
);
CREATE INDEX "budget_lines_tenant_id_idx" ON "budget_lines"("tenant_id");
