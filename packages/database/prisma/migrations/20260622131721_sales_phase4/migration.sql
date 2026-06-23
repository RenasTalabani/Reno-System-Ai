-- CreateTable
CREATE TABLE "sales_currencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_taxes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "rate" DECIMAL(8,4) NOT NULL,
    "tax_type" VARCHAR(50) NOT NULL DEFAULT 'percentage',
    "scope" VARCHAR(50) NOT NULL DEFAULT 'all',
    "country" VARCHAR(100),
    "region" VARCHAR(100),
    "is_compound" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_price_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "valid_from" DATE,
    "valid_to" DATE,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tax_id" UUID,
    "name" VARCHAR(500) NOT NULL,
    "sku" VARCHAR(100),
    "description" TEXT,
    "product_type" VARCHAR(50) NOT NULL DEFAULT 'product',
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "unit" VARCHAR(50) NOT NULL DEFAULT 'unit',
    "billing_interval" VARCHAR(50),
    "image_url" VARCHAR(500),
    "category" VARCHAR(100),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "ai_pricing_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_discounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "discount_type" VARCHAR(50) NOT NULL DEFAULT 'percentage',
    "value" DECIMAL(10,2) NOT NULL,
    "min_order_value" DECIMAL(15,2),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" DATE,
    "valid_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "contact_id" UUID,
    "company_id" UUID,
    "opportunity_id" UUID,
    "owner_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_code" VARCHAR(100),
    "valid_until" DATE,
    "notes" TEXT,
    "terms" TEXT,
    "billing_address" JSONB,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "converted_to_order_id" UUID,
    "ai_insights" JSONB,
    "win_probability" DECIMAL(3,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quotation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "product_id" UUID,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'unit',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "quotation_id" UUID,
    "contact_id" UUID,
    "company_id" UUID,
    "owner_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_code" VARCHAR(100),
    "billing_address" JSONB,
    "shipping_address" JSONB,
    "notes" TEXT,
    "terms" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "revenue_forecast" DECIMAL(15,2),
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "delivered_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "cancelled_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'unit',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "order_id" UUID,
    "contact_id" UUID,
    "company_id" UUID,
    "owner_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "issued_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "payment_terms" VARCHAR(100),
    "payment_reference" VARCHAR(255),
    "billing_address" JSONB,
    "notes" TEXT,
    "terms" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID,
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'unit',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payment_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "method_type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "payment_method_id" UUID,
    "contact_id" UUID,
    "company_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "amount_in_base" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "method" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'completed',
    "reference" VARCHAR(255),
    "gateway_id" VARCHAR(500),
    "gateway_response" JSONB,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "company_id" UUID,
    "product_id" UUID,
    "owner_id" UUID,
    "plan_name" VARCHAR(255) NOT NULL,
    "billing_interval" VARCHAR(50) NOT NULL DEFAULT 'monthly',
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "trial_end_date" DATE,
    "next_billing_date" DATE,
    "last_billing_date" DATE,
    "billing_count" INTEGER NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "paused_at" TIMESTAMP(3),
    "ai_churn_risk" DECIMAL(3,2),
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_currencies_tenant_id_idx" ON "sales_currencies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_currencies_tenant_id_code_key" ON "sales_currencies"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "sales_taxes_tenant_id_idx" ON "sales_taxes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_taxes_tenant_id_code_key" ON "sales_taxes"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "sales_price_lists_tenant_id_idx" ON "sales_price_lists"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_products_tenant_id_idx" ON "sales_products"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_products_tenant_id_product_type_idx" ON "sales_products"("tenant_id", "product_type");

-- CreateIndex
CREATE INDEX "sales_products_tenant_id_category_idx" ON "sales_products"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "sales_products_tenant_id_sku_key" ON "sales_products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "sales_discounts_tenant_id_idx" ON "sales_discounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_discounts_tenant_id_code_key" ON "sales_discounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "sales_quotations_tenant_id_idx" ON "sales_quotations"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_quotations_tenant_id_status_idx" ON "sales_quotations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_quotations_tenant_id_contact_id_idx" ON "sales_quotations"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "sales_quotations_tenant_id_company_id_idx" ON "sales_quotations"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "sales_quotations_tenant_id_owner_id_idx" ON "sales_quotations"("tenant_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_quotations_tenant_id_number_key" ON "sales_quotations"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "sales_quotation_items_tenant_id_quotation_id_idx" ON "sales_quotation_items"("tenant_id", "quotation_id");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_idx" ON "sales_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_status_idx" ON "sales_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_contact_id_idx" ON "sales_orders"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_company_id_idx" ON "sales_orders"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_owner_id_idx" ON "sales_orders"("tenant_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_tenant_id_number_key" ON "sales_orders"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "sales_order_items_tenant_id_order_id_idx" ON "sales_order_items"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_idx" ON "sales_invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_status_idx" ON "sales_invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_contact_id_idx" ON "sales_invoices"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_company_id_idx" ON "sales_invoices"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "sales_invoices_tenant_id_due_date_idx" ON "sales_invoices"("tenant_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_tenant_id_number_key" ON "sales_invoices"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "sales_invoice_items_tenant_id_invoice_id_idx" ON "sales_invoice_items"("tenant_id", "invoice_id");

-- CreateIndex
CREATE INDEX "sales_payment_methods_tenant_id_idx" ON "sales_payment_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_payments_tenant_id_idx" ON "sales_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_payments_tenant_id_invoice_id_idx" ON "sales_payments"("tenant_id", "invoice_id");

-- CreateIndex
CREATE INDEX "sales_payments_tenant_id_status_idx" ON "sales_payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_payments_tenant_id_paid_at_idx" ON "sales_payments"("tenant_id", "paid_at");

-- CreateIndex
CREATE INDEX "sales_subscriptions_tenant_id_idx" ON "sales_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_subscriptions_tenant_id_status_idx" ON "sales_subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_subscriptions_tenant_id_contact_id_idx" ON "sales_subscriptions"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "sales_subscriptions_tenant_id_company_id_idx" ON "sales_subscriptions"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "sales_subscriptions_tenant_id_next_billing_date_idx" ON "sales_subscriptions"("tenant_id", "next_billing_date");

-- AddForeignKey
ALTER TABLE "sales_currencies" ADD CONSTRAINT "sales_currencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_taxes" ADD CONSTRAINT "sales_taxes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_price_lists" ADD CONSTRAINT "sales_price_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_products" ADD CONSTRAINT "sales_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_products" ADD CONSTRAINT "sales_products_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "sales_taxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_discounts" ADD CONSTRAINT "sales_discounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotations" ADD CONSTRAINT "sales_quotations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotation_items" ADD CONSTRAINT "sales_quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "sales_quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotation_items" ADD CONSTRAINT "sales_quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "sales_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "sales_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_subscriptions" ADD CONSTRAINT "sales_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_subscriptions" ADD CONSTRAINT "sales_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
