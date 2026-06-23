-- CreateTable
CREATE TABLE "proc_supplier_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" TEXT,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255),
    "category_id" UUID,
    "fin_vendor_id" UUID,
    "tax_id" VARCHAR(100),
    "registration_no" VARCHAR(100),
    "website" VARCHAR(500),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "payment_terms" INTEGER,
    "lead_time_days" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "quality_score" DECIMAL(5,2),
    "delivery_score" DECIMAL(5,2),
    "pricing_score" DECIMAL(5,2),
    "responsiveness_score" DECIMAL(5,2),
    "overall_score" DECIMAL(5,2),
    "ai_risk_score" DECIMAL(5,4),
    "ai_performance_score" DECIMAL(5,4),
    "ai_recommended" BOOLEAN NOT NULL DEFAULT false,
    "ai_insights" TEXT,
    "ai_last_analyzed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_supplier_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_supplier_price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "product_id" UUID,
    "product_code" VARCHAR(100),
    "product_name" VARCHAR(255),
    "unit_price" DECIMAL(18,4) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "min_qty" DECIMAL(18,4),
    "lead_time_days" INTEGER,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "source" VARCHAR(30),
    "source_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_supplier_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_requisitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "requested_by_id" UUID,
    "requested_by_name" VARCHAR(255),
    "department_id" UUID,
    "warehouse_id" UUID,
    "required_date" TIMESTAMP(3),
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "reason" TEXT,
    "notes" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_requisition_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "requisition_id" UUID NOT NULL,
    "product_id" UUID,
    "product_code" VARCHAR(100),
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_id" UUID,
    "estimated_price" DECIMAL(18,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "account_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_requisition_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_rfqs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "requisition_id" UUID,
    "required_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_rfq_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "product_id" UUID,
    "product_code" VARCHAR(100),
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_rfq_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_rfq_suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_rfq_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_supplier_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "rfq_id" UUID,
    "supplier_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'received',
    "valid_until" TIMESTAMP(3),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "total_amount" DECIMAL(18,2),
    "payment_terms" INTEGER,
    "lead_time_days" INTEGER,
    "delivery_terms" VARCHAR(100),
    "notes" TEXT,
    "evaluation_score" DECIMAL(5,2),
    "evaluation_notes" TEXT,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_supplier_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_supplier_quotation_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "product_id" UUID,
    "product_code" VARCHAR(100),
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_id" UUID,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "total_price" DECIMAL(18,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "lead_time_days" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_supplier_quotation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "supplier_id" UUID NOT NULL,
    "quotation_id" UUID,
    "requisition_id" UUID,
    "warehouse_id" UUID,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payment_terms" INTEGER,
    "expected_date" TIMESTAMP(3),
    "shipping_address" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "internal_notes" TEXT,
    "sent_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "inv_receipt_id" UUID,
    "fin_vendor_bill_id" UUID,
    "ai_lead_time_score" DECIMAL(5,4),
    "ai_price_score" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "product_code" VARCHAR(100),
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "received_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_id" UUID,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "total_price" DECIMAL(18,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "tax_rate" DECIMAL(5,2),
    "discount_rate" DECIMAL(5,2),
    "account_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_order_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "approver_id" UUID,
    "approver_name" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "action_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proc_order_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proc_vendor_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "order_id" UUID,
    "evaluation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluated_by_id" UUID,
    "quality_score" DECIMAL(5,2),
    "delivery_score" DECIMAL(5,2),
    "pricing_score" DECIMAL(5,2),
    "responsiveness_score" DECIMAL(5,2),
    "overall_score" DECIMAL(5,2),
    "notes" TEXT,
    "ordered_date" TIMESTAMP(3),
    "expected_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),
    "days_late" INTEGER,
    "defect_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proc_vendor_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proc_supplier_categories_tenant_id_idx" ON "proc_supplier_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "proc_supplier_categories_tenant_id_code_key" ON "proc_supplier_categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "proc_suppliers_tenant_id_idx" ON "proc_suppliers"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_suppliers_tenant_id_deleted_at_idx" ON "proc_suppliers"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "proc_suppliers_tenant_id_code_key" ON "proc_suppliers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "proc_supplier_contacts_tenant_id_idx" ON "proc_supplier_contacts"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_supplier_price_history_tenant_id_idx" ON "proc_supplier_price_history"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_supplier_price_history_tenant_id_supplier_id_product_i_idx" ON "proc_supplier_price_history"("tenant_id", "supplier_id", "product_id");

-- CreateIndex
CREATE INDEX "proc_requisitions_tenant_id_idx" ON "proc_requisitions"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_requisitions_tenant_id_deleted_at_idx" ON "proc_requisitions"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "proc_requisitions_tenant_id_number_key" ON "proc_requisitions"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "proc_requisition_lines_tenant_id_idx" ON "proc_requisition_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_rfqs_tenant_id_idx" ON "proc_rfqs"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_rfqs_tenant_id_deleted_at_idx" ON "proc_rfqs"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "proc_rfqs_tenant_id_number_key" ON "proc_rfqs"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "proc_rfq_lines_tenant_id_idx" ON "proc_rfq_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_rfq_suppliers_tenant_id_idx" ON "proc_rfq_suppliers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "proc_rfq_suppliers_tenant_id_rfq_id_supplier_id_key" ON "proc_rfq_suppliers"("tenant_id", "rfq_id", "supplier_id");

-- CreateIndex
CREATE INDEX "proc_supplier_quotations_tenant_id_idx" ON "proc_supplier_quotations"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_supplier_quotations_tenant_id_deleted_at_idx" ON "proc_supplier_quotations"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "proc_supplier_quotations_tenant_id_number_key" ON "proc_supplier_quotations"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "proc_supplier_quotation_lines_tenant_id_idx" ON "proc_supplier_quotation_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_orders_tenant_id_idx" ON "proc_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_orders_tenant_id_deleted_at_idx" ON "proc_orders"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "proc_orders_tenant_id_number_key" ON "proc_orders"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "proc_order_lines_tenant_id_idx" ON "proc_order_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_order_approvals_tenant_id_idx" ON "proc_order_approvals"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_vendor_evaluations_tenant_id_idx" ON "proc_vendor_evaluations"("tenant_id");

-- CreateIndex
CREATE INDEX "proc_vendor_evaluations_tenant_id_supplier_id_idx" ON "proc_vendor_evaluations"("tenant_id", "supplier_id");

-- AddForeignKey
ALTER TABLE "proc_supplier_categories" ADD CONSTRAINT "proc_supplier_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_categories" ADD CONSTRAINT "proc_supplier_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "proc_supplier_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_suppliers" ADD CONSTRAINT "proc_suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_suppliers" ADD CONSTRAINT "proc_suppliers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "proc_supplier_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_contacts" ADD CONSTRAINT "proc_supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "proc_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_price_history" ADD CONSTRAINT "proc_supplier_price_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_price_history" ADD CONSTRAINT "proc_supplier_price_history_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "proc_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_requisitions" ADD CONSTRAINT "proc_requisitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_requisition_lines" ADD CONSTRAINT "proc_requisition_lines_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "proc_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_rfqs" ADD CONSTRAINT "proc_rfqs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_rfqs" ADD CONSTRAINT "proc_rfqs_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "proc_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_rfq_lines" ADD CONSTRAINT "proc_rfq_lines_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "proc_rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_rfq_suppliers" ADD CONSTRAINT "proc_rfq_suppliers_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "proc_rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_rfq_suppliers" ADD CONSTRAINT "proc_rfq_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "proc_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_quotations" ADD CONSTRAINT "proc_supplier_quotations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_quotations" ADD CONSTRAINT "proc_supplier_quotations_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "proc_rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_quotations" ADD CONSTRAINT "proc_supplier_quotations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "proc_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_supplier_quotation_lines" ADD CONSTRAINT "proc_supplier_quotation_lines_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "proc_supplier_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_orders" ADD CONSTRAINT "proc_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_orders" ADD CONSTRAINT "proc_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "proc_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_orders" ADD CONSTRAINT "proc_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "proc_supplier_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_order_lines" ADD CONSTRAINT "proc_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "proc_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_order_approvals" ADD CONSTRAINT "proc_order_approvals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "proc_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_vendor_evaluations" ADD CONSTRAINT "proc_vendor_evaluations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proc_vendor_evaluations" ADD CONSTRAINT "proc_vendor_evaluations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "proc_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
