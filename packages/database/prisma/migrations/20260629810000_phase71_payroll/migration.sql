-- Phase 71: Payroll Engine
CREATE TABLE "payroll_pay_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "period" VARCHAR(20) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "total_gross" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_net" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "processed_at" TIMESTAMPTZ,
  "approved_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "payroll_pay_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_pay_runs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "payroll_pay_runs_tenant_id_idx" ON "payroll_pay_runs"("tenant_id");

CREATE TABLE "payroll_payslips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "pay_run_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "gross_pay" DECIMAL(14,2) NOT NULL,
  "net_pay" DECIMAL(14,2) NOT NULL,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "deductions" JSONB NOT NULL DEFAULT '[]',
  "allowances" JSONB NOT NULL DEFAULT '[]',
  "hours_worked" DECIMAL(8,2),
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "payroll_payslips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_payslips_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "payroll_payslips_pay_run_fkey" FOREIGN KEY ("pay_run_id") REFERENCES "payroll_pay_runs"("id")
);
CREATE INDEX "payroll_payslips_tenant_id_idx" ON "payroll_payslips"("tenant_id");
CREATE INDEX "payroll_payslips_pay_run_idx" ON "payroll_payslips"("tenant_id", "pay_run_id");
