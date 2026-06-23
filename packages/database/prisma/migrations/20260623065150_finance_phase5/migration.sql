-- CreateTable
CREATE TABLE "fin_fiscal_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMP(3),
    "locked_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "period_number" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMP(3),
    "closed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(500),
    "type" VARCHAR(30) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "normal_balance" VARCHAR(10) NOT NULL DEFAULT 'debit',
    "parent_id" UUID,
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_detail" BOOLEAN NOT NULL DEFAULT true,
    "is_bank_account" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "currency" VARCHAR(10),
    "description" TEXT,
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_cost_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(30) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'general',
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "date" DATE NOT NULL,
    "period_id" UUID,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "reference" VARCHAR(255),
    "description" TEXT,
    "notes" TEXT,
    "source_type" VARCHAR(50),
    "source_id" UUID,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_template_id" UUID,
    "recurring_interval" VARCHAR(20),
    "recurring_end_date" DATE,
    "next_recurring_date" DATE,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMP(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "posted_by" UUID,
    "posted_at" TIMESTAMP(3),
    "voided_by" UUID,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "ai_anomaly_score" DECIMAL(5,4),
    "ai_anomaly_flags" JSONB,
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_journal_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "journal_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "description" VARCHAR(500),
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "debit_base" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "credit_base" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_id" UUID,
    "tax_amount" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMP(3),
    "source_type" VARCHAR(50),
    "source_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(100),
    "iban" VARCHAR(50),
    "swift" VARCHAR(20),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMP(3),
    "gateway_type" VARCHAR(50),
    "gateway_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_bank_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "value_date" DATE,
    "description" VARCHAR(500) NOT NULL,
    "reference" VARCHAR(255),
    "amount" DECIMAL(18,4) NOT NULL,
    "running_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMP(3),
    "journal_line_id" UUID,
    "ai_category" VARCHAR(100),
    "ai_account_id" UUID,
    "ai_confidence" DECIMAL(3,2),
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(30),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" JSONB,
    "tax_id" VARCHAR(100),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "payment_terms" INTEGER,
    "ap_account_id" UUID,
    "notes" TEXT,
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_vendor_bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "number" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "period_id" UUID,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "journal_id" UUID,
    "notes" TEXT,
    "ai_payment_risk" DECIMAL(3,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_vendor_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_vendor_bill_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_vendor_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_vendor_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "bill_id" UUID,
    "bank_account_id" UUID,
    "number" VARCHAR(30) NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "method" VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    "reference" VARCHAR(255),
    "journal_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "ai_forecasts" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_budget_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "period_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fin_fiscal_years_tenant_id_idx" ON "fin_fiscal_years"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_fiscal_years_tenant_id_code_key" ON "fin_fiscal_years"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "fin_periods_tenant_id_idx" ON "fin_periods"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_periods_tenant_id_status_idx" ON "fin_periods"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fin_periods_tenant_id_fiscal_year_id_period_number_key" ON "fin_periods"("tenant_id", "fiscal_year_id", "period_number");

-- CreateIndex
CREATE INDEX "fin_accounts_tenant_id_idx" ON "fin_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_accounts_tenant_id_type_idx" ON "fin_accounts"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "fin_accounts_tenant_id_parent_id_idx" ON "fin_accounts"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_accounts_tenant_id_code_key" ON "fin_accounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "fin_cost_centers_tenant_id_idx" ON "fin_cost_centers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_cost_centers_tenant_id_code_key" ON "fin_cost_centers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "fin_journal_entries_tenant_id_idx" ON "fin_journal_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_journal_entries_tenant_id_status_idx" ON "fin_journal_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "fin_journal_entries_tenant_id_date_idx" ON "fin_journal_entries"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "fin_journal_entries_tenant_id_type_idx" ON "fin_journal_entries"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "fin_journal_entries_tenant_id_period_id_idx" ON "fin_journal_entries"("tenant_id", "period_id");

-- CreateIndex
CREATE INDEX "fin_journal_entries_tenant_id_source_type_source_id_idx" ON "fin_journal_entries"("tenant_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_journal_entries_tenant_id_number_key" ON "fin_journal_entries"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "fin_journal_lines_tenant_id_idx" ON "fin_journal_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_journal_lines_tenant_id_journal_id_idx" ON "fin_journal_lines"("tenant_id", "journal_id");

-- CreateIndex
CREATE INDEX "fin_journal_lines_tenant_id_account_id_idx" ON "fin_journal_lines"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "fin_journal_lines_tenant_id_cost_center_id_idx" ON "fin_journal_lines"("tenant_id", "cost_center_id");

-- CreateIndex
CREATE INDEX "fin_journal_lines_tenant_id_reconciled_idx" ON "fin_journal_lines"("tenant_id", "reconciled");

-- CreateIndex
CREATE UNIQUE INDEX "fin_bank_accounts_account_id_key" ON "fin_bank_accounts"("account_id");

-- CreateIndex
CREATE INDEX "fin_bank_accounts_tenant_id_idx" ON "fin_bank_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_bank_transactions_tenant_id_idx" ON "fin_bank_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_bank_transactions_tenant_id_bank_account_id_idx" ON "fin_bank_transactions"("tenant_id", "bank_account_id");

-- CreateIndex
CREATE INDEX "fin_bank_transactions_tenant_id_is_reconciled_idx" ON "fin_bank_transactions"("tenant_id", "is_reconciled");

-- CreateIndex
CREATE INDEX "fin_bank_transactions_tenant_id_date_idx" ON "fin_bank_transactions"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "fin_vendors_tenant_id_idx" ON "fin_vendors"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_vendors_tenant_id_code_key" ON "fin_vendors"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "fin_vendor_bills_tenant_id_idx" ON "fin_vendor_bills"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_vendor_bills_tenant_id_status_idx" ON "fin_vendor_bills"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "fin_vendor_bills_tenant_id_vendor_id_idx" ON "fin_vendor_bills"("tenant_id", "vendor_id");

-- CreateIndex
CREATE INDEX "fin_vendor_bills_tenant_id_due_date_idx" ON "fin_vendor_bills"("tenant_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "fin_vendor_bills_tenant_id_number_key" ON "fin_vendor_bills"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "fin_vendor_bill_lines_tenant_id_idx" ON "fin_vendor_bill_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_vendor_bill_lines_tenant_id_bill_id_idx" ON "fin_vendor_bill_lines"("tenant_id", "bill_id");

-- CreateIndex
CREATE INDEX "fin_vendor_payments_tenant_id_idx" ON "fin_vendor_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_vendor_payments_tenant_id_vendor_id_idx" ON "fin_vendor_payments"("tenant_id", "vendor_id");

-- CreateIndex
CREATE INDEX "fin_vendor_payments_tenant_id_bill_id_idx" ON "fin_vendor_payments"("tenant_id", "bill_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_vendor_payments_tenant_id_number_key" ON "fin_vendor_payments"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "fin_budgets_tenant_id_idx" ON "fin_budgets"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_budgets_tenant_id_fiscal_year_id_idx" ON "fin_budgets"("tenant_id", "fiscal_year_id");

-- CreateIndex
CREATE INDEX "fin_budget_lines_tenant_id_idx" ON "fin_budget_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "fin_budget_lines_tenant_id_budget_id_idx" ON "fin_budget_lines"("tenant_id", "budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_budget_lines_tenant_id_budget_id_account_id_period_id_key" ON "fin_budget_lines"("tenant_id", "budget_id", "account_id", "period_id");

-- AddForeignKey
ALTER TABLE "fin_fiscal_years" ADD CONSTRAINT "fin_fiscal_years_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_periods" ADD CONSTRAINT "fin_periods_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fin_fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts" ADD CONSTRAINT "fin_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts" ADD CONSTRAINT "fin_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "fin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_cost_centers" ADD CONSTRAINT "fin_cost_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_cost_centers" ADD CONSTRAINT "fin_cost_centers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "fin_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "fin_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "fin_journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "fin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "fin_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "fin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_transactions" ADD CONSTRAINT "fin_bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "fin_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendors" ADD CONSTRAINT "fin_vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_bills" ADD CONSTRAINT "fin_vendor_bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_bills" ADD CONSTRAINT "fin_vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "fin_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_bill_lines" ADD CONSTRAINT "fin_vendor_bill_lines_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "fin_vendor_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_bill_lines" ADD CONSTRAINT "fin_vendor_bill_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "fin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_bill_lines" ADD CONSTRAINT "fin_vendor_bill_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "fin_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_payments" ADD CONSTRAINT "fin_vendor_payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "fin_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_vendor_payments" ADD CONSTRAINT "fin_vendor_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "fin_vendor_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budgets" ADD CONSTRAINT "fin_budgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget_lines" ADD CONSTRAINT "fin_budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "fin_budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget_lines" ADD CONSTRAINT "fin_budget_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "fin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget_lines" ADD CONSTRAINT "fin_budget_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "fin_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_budget_lines" ADD CONSTRAINT "fin_budget_lines_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
