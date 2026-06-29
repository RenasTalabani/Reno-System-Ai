-- Phase 61: Billing & Subscription Management
CREATE TABLE "billing_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "interval" VARCHAR(20) NOT NULL DEFAULT 'month',
  "interval_count" INTEGER NOT NULL DEFAULT 1,
  "trial_days" INTEGER NOT NULL DEFAULT 0,
  "features" JSONB NOT NULL DEFAULT '[]',
  "limits" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "billing_plans_tenant_id_idx" ON "billing_plans"("tenant_id");

CREATE TABLE "billing_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "current_period_start" TIMESTAMPTZ NOT NULL,
  "current_period_end" TIMESTAMPTZ NOT NULL,
  "trial_start" TIMESTAMPTZ,
  "trial_end" TIMESTAMPTZ,
  "cancel_at" TIMESTAMPTZ,
  "canceled_at" TIMESTAMPTZ,
  "ended_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "billing_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id")
);
CREATE INDEX "billing_subscriptions_tenant_id_idx" ON "billing_subscriptions"("tenant_id");
CREATE INDEX "billing_subscriptions_tenant_status_idx" ON "billing_subscriptions"("tenant_id","status");

CREATE TABLE "billing_invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID,
  "number" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "due_date" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "voided_at" TIMESTAMPTZ,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_invoices_tenant_number_key" UNIQUE ("tenant_id","number"),
  CONSTRAINT "billing_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "billing_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id")
);
CREATE INDEX "billing_invoices_tenant_status_idx" ON "billing_invoices"("tenant_id","status");

CREATE TABLE "billing_invoice_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "tax_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "billing_invoice_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoices"("id") ON DELETE CASCADE
);
CREATE INDEX "billing_invoice_items_invoice_id_idx" ON "billing_invoice_items"("invoice_id");

CREATE TABLE "billing_payment_methods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "last4" VARCHAR(4),
  "brand" VARCHAR(50),
  "expiry_month" INTEGER,
  "expiry_year" INTEGER,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "provider_ref" VARCHAR(500),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "billing_payment_methods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "billing_payment_methods_tenant_id_idx" ON "billing_payment_methods"("tenant_id");

CREATE TABLE "billing_usage_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "metric" VARCHAR(100) NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "billing_usage_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_usage_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "billing_usage_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id")
);
CREATE INDEX "billing_usage_records_tenant_metric_idx" ON "billing_usage_records"("tenant_id","metric","recorded_at");
