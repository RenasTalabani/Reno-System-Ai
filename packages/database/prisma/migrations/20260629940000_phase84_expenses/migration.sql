-- Phase 84: Expense Management
CREATE TABLE IF NOT EXISTS "exp_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "period" VARCHAR(20) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "exp_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exp_reports_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "exp_reports_tenant_id_idx" ON "exp_reports"("tenant_id");
CREATE INDEX IF NOT EXISTS "exp_reports_employee_idx" ON "exp_reports"("tenant_id", "employee_id");

CREATE TABLE IF NOT EXISTS "exp_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "report_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "receipt_url" VARCHAR(1000),
  "is_billable" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "exp_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exp_items_report_fkey" FOREIGN KEY ("report_id") REFERENCES "exp_reports"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "exp_items_report_idx" ON "exp_items"("report_id");