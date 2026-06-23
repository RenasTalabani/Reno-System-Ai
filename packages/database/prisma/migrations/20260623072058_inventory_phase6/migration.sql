-- CreateTable
CREATE TABLE "inv_categories" (
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

    CONSTRAINT "inv_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'count',
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "base_unit_id" UUID,
    "conversion_factor" DECIMAL(20,10) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "unit_id" UUID,
    "type" VARCHAR(20) NOT NULL DEFAULT 'storable',
    "barcode" VARCHAR(100),
    "qr_code" VARCHAR(255),
    "image_url" VARCHAR(500),
    "cost_price" DECIMAL(18,4),
    "sale_price" DECIMAL(18,4),
    "min_stock_level" DECIMAL(18,4),
    "max_stock_level" DECIMAL(18,4),
    "reorder_qty" DECIMAL(18,4),
    "lead_time_days" INTEGER,
    "track_batch" BOOLEAN NOT NULL DEFAULT false,
    "track_serial" BOOLEAN NOT NULL DEFAULT false,
    "track_expiry" BOOLEAN NOT NULL DEFAULT false,
    "valuation_method" VARCHAR(20) NOT NULL DEFAULT 'average',
    "standard_cost" DECIMAL(18,4),
    "ai_demand_score" DECIMAL(5,4),
    "ai_forecasted_demand" DECIMAL(18,4),
    "ai_shortage_risk" DECIMAL(5,4),
    "ai_overstock_risk" DECIMAL(5,4),
    "ai_reorder_suggestion" DECIMAL(18,4),
    "ai_last_analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "valuation_account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_warehouse_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'storage',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_warehouse_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_bins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255),
    "barcode" VARCHAR(100),
    "capacity" DECIMAL(18,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_bins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "manufactured_date" TIMESTAMP(3),
    "supplier_lot" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_serials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_stock',
    "warehouse_id" UUID,
    "bin_id" UUID,
    "lot_id" UUID,
    "purchased_at" TIMESTAMP(3),
    "sold_at" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_serials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "product_id" UUID NOT NULL,
    "from_warehouse_id" UUID,
    "to_warehouse_id" UUID,
    "from_zone_id" UUID,
    "to_zone_id" UUID,
    "from_bin_id" UUID,
    "to_bin_id" UUID,
    "lot_id" UUID,
    "serial_id" UUID,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4),
    "total_cost" DECIMAL(18,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" VARCHAR(100),
    "reference_type" VARCHAR(30),
    "reference_id" UUID,
    "notes" TEXT,
    "ai_flag" BOOLEAN NOT NULL DEFAULT false,
    "ai_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_stock_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "on_hand" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "available" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(18,4),
    "total_value" DECIMAL(18,4),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "warehouse_id" UUID NOT NULL,
    "zone_id" UUID,
    "supplier_id" UUID,
    "supplier_name" VARCHAR(255),
    "reference" VARCHAR(100),
    "receipt_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_receipt_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "expected_qty" DECIMAL(18,4) NOT NULL,
    "received_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(18,4),
    "total_cost" DECIMAL(18,4),
    "lot_id" UUID,
    "expiry_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "from_warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID NOT NULL,
    "from_zone_id" UUID,
    "to_zone_id" UUID,
    "from_bin_id" UUID,
    "to_bin_id" UUID,
    "transfer_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_transfer_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "lot_id" UUID,
    "serial_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "warehouse_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'correction',
    "reason" TEXT,
    "adjustment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inv_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_adjustment_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "adjustment_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "zone_id" UUID,
    "bin_id" UUID,
    "lot_id" UUID,
    "serial_id" UUID,
    "system_qty" DECIMAL(18,4) NOT NULL,
    "counted_qty" DECIMAL(18,4) NOT NULL,
    "difference" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_adjustment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_reorder_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "min_qty" DECIMAL(18,4) NOT NULL,
    "max_qty" DECIMAL(18,4) NOT NULL,
    "reorder_qty" DECIMAL(18,4) NOT NULL,
    "lead_time_days" INTEGER NOT NULL DEFAULT 7,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "ai_suggested_min_qty" DECIMAL(18,4),
    "ai_suggested_reorder_qty" DECIMAL(18,4),
    "ai_confidence_score" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inv_reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inv_categories_tenant_id_idx" ON "inv_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_categories_tenant_id_deleted_at_idx" ON "inv_categories"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "inv_categories_tenant_id_code_key" ON "inv_categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "inv_units_tenant_id_idx" ON "inv_units"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_products_tenant_id_idx" ON "inv_products"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_products_tenant_id_deleted_at_idx" ON "inv_products"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "inv_products_tenant_id_code_key" ON "inv_products"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "inv_warehouses_tenant_id_idx" ON "inv_warehouses"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_warehouses_tenant_id_deleted_at_idx" ON "inv_warehouses"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "inv_warehouses_tenant_id_code_key" ON "inv_warehouses"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "inv_warehouse_zones_tenant_id_idx" ON "inv_warehouse_zones"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_warehouse_zones_tenant_id_warehouse_id_code_key" ON "inv_warehouse_zones"("tenant_id", "warehouse_id", "code");

-- CreateIndex
CREATE INDEX "inv_bins_tenant_id_idx" ON "inv_bins"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_bins_tenant_id_zone_id_code_key" ON "inv_bins"("tenant_id", "zone_id", "code");

-- CreateIndex
CREATE INDEX "inv_lots_tenant_id_idx" ON "inv_lots"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_lots_tenant_id_product_id_number_key" ON "inv_lots"("tenant_id", "product_id", "number");

-- CreateIndex
CREATE INDEX "inv_serials_tenant_id_idx" ON "inv_serials"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_serials_tenant_id_product_id_number_key" ON "inv_serials"("tenant_id", "product_id", "number");

-- CreateIndex
CREATE INDEX "inv_movements_tenant_id_idx" ON "inv_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_movements_tenant_id_product_id_idx" ON "inv_movements"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "inv_movements_tenant_id_date_idx" ON "inv_movements"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "inv_movements_tenant_id_number_key" ON "inv_movements"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "inv_stock_balances_tenant_id_idx" ON "inv_stock_balances"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_stock_balances_tenant_id_product_id_idx" ON "inv_stock_balances"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_stock_balances_tenant_id_product_id_warehouse_id_key" ON "inv_stock_balances"("tenant_id", "product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "inv_receipts_tenant_id_idx" ON "inv_receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_receipts_tenant_id_deleted_at_idx" ON "inv_receipts"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "inv_receipts_tenant_id_number_key" ON "inv_receipts"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "inv_receipt_lines_tenant_id_idx" ON "inv_receipt_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_transfers_tenant_id_idx" ON "inv_transfers"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_transfers_tenant_id_deleted_at_idx" ON "inv_transfers"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "inv_transfers_tenant_id_number_key" ON "inv_transfers"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "inv_transfer_lines_tenant_id_idx" ON "inv_transfer_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_adjustments_tenant_id_idx" ON "inv_adjustments"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_adjustments_tenant_id_deleted_at_idx" ON "inv_adjustments"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "inv_adjustments_tenant_id_number_key" ON "inv_adjustments"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "inv_adjustment_lines_tenant_id_idx" ON "inv_adjustment_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "inv_reorder_rules_tenant_id_idx" ON "inv_reorder_rules"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_reorder_rules_tenant_id_product_id_warehouse_id_key" ON "inv_reorder_rules"("tenant_id", "product_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "inv_categories" ADD CONSTRAINT "inv_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_categories" ADD CONSTRAINT "inv_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "inv_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_units" ADD CONSTRAINT "inv_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_units" ADD CONSTRAINT "inv_units_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "inv_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_products" ADD CONSTRAINT "inv_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_products" ADD CONSTRAINT "inv_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inv_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_products" ADD CONSTRAINT "inv_products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inv_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_warehouses" ADD CONSTRAINT "inv_warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_warehouse_zones" ADD CONSTRAINT "inv_warehouse_zones_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_bins" ADD CONSTRAINT "inv_bins_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "inv_warehouse_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_lots" ADD CONSTRAINT "inv_lots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_lots" ADD CONSTRAINT "inv_lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_serials" ADD CONSTRAINT "inv_serials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_serials" ADD CONSTRAINT "inv_serials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inv_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_serial_id_fkey" FOREIGN KEY ("serial_id") REFERENCES "inv_serials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_balances" ADD CONSTRAINT "inv_stock_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_balances" ADD CONSTRAINT "inv_stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_balances" ADD CONSTRAINT "inv_stock_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_receipts" ADD CONSTRAINT "inv_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_receipts" ADD CONSTRAINT "inv_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_receipt_lines" ADD CONSTRAINT "inv_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "inv_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_receipt_lines" ADD CONSTRAINT "inv_receipt_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_transfer_lines" ADD CONSTRAINT "inv_transfer_lines_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "inv_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_transfer_lines" ADD CONSTRAINT "inv_transfer_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_adjustments" ADD CONSTRAINT "inv_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_adjustments" ADD CONSTRAINT "inv_adjustments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_adjustment_lines" ADD CONSTRAINT "inv_adjustment_lines_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "inv_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_adjustment_lines" ADD CONSTRAINT "inv_adjustment_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_reorder_rules" ADD CONSTRAINT "inv_reorder_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_reorder_rules" ADD CONSTRAINT "inv_reorder_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_reorder_rules" ADD CONSTRAINT "inv_reorder_rules_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inv_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
