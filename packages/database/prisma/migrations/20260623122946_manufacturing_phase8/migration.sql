-- CreateTable
CREATE TABLE "mfg_bom_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "finished_product_id" UUID NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "type" VARCHAR(30) NOT NULL DEFAULT 'production',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unit_id" UUID,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "routing_id" UUID,
    "notes" TEXT,
    "ai_yield_rate" DECIMAL(5,4),
    "ai_cycle_time" DECIMAL(10,2),
    "ai_cost_estimate" DECIMAL(18,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mfg_bom_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_bom_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bom_id" UUID NOT NULL,
    "parent_line_id" UUID,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "component_id" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "scrap_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "unit_id" UUID,
    "type" VARCHAR(20) NOT NULL DEFAULT 'component',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_bom_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_work_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'machine',
    "capacity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "capacity_unit" VARCHAR(20) NOT NULL DEFAULT 'hour',
    "cost_per_hour" DECIMAL(18,4),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "oee_target" DECIMAL(5,4),
    "oee_actual" DECIMAL(5,4),
    "mtbf_hours" DECIMAL(10,2),
    "mttr_hours" DECIMAL(10,2),
    "last_maintenance_at" TIMESTAMP(3),
    "next_maintenance_at" TIMESTAMP(3),
    "maintenance_interval_days" INTEGER,
    "digital_twin_id" VARCHAR(255),
    "digital_twin_url" VARCHAR(500),
    "mes_device_id" VARCHAR(255),
    "mes_protocol" VARCHAR(50),
    "ai_efficiency_score" DECIMAL(5,4),
    "ai_downtime_risk" DECIMAL(5,4),
    "ai_maintenance_priority" VARCHAR(20),
    "ai_insights" TEXT,
    "simulation_capacity" DECIMAL(10,2),
    "simulation_setup_time" DECIMAL(10,2),
    "notes" TEXT,
    "warehouse_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mfg_work_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_maintenance_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "work_center_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'preventive',
    "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "downtime_hours" DECIMAL(10,2),
    "technician" VARCHAR(255),
    "description" TEXT,
    "root_cause" TEXT,
    "resolution" TEXT,
    "cost" DECIMAL(18,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mfg_maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_routings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mfg_routings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_routing_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "routing_id" UUID NOT NULL,
    "work_center_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(255) NOT NULL,
    "duration_hours" DECIMAL(10,2) NOT NULL,
    "setup_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_routing_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "bom_id" UUID,
    "finished_product_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "planned_qty" DECIMAL(18,4) NOT NULL,
    "produced_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "scrap_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_id" UUID,
    "scheduled_start" TIMESTAMP(3),
    "scheduled_end" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "origin" VARCHAR(50),
    "origin_id" UUID,
    "notes" TEXT,
    "component_move_ref" VARCHAR(100),
    "finished_move_ref" VARCHAR(100),
    "ai_production_score" DECIMAL(5,4),
    "ai_yield_forecast" DECIMAL(18,4),
    "ai_bottleneck_risk" DECIMAL(5,4),
    "ai_lead_time_forecast" DECIMAL(10,2),
    "ai_insights" TEXT,
    "simulation_run_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mfg_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_order_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "planned_qty" DECIMAL(18,4) NOT NULL,
    "consumed_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "scrap_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_id" UUID,
    "warehouse_id" UUID,
    "lot_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_order_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_order_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "work_center_id" UUID,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "planned_hours" DECIMAL(10,2) NOT NULL,
    "actual_hours" DECIMAL(10,2),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "operator_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_order_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_quality_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "order_id" UUID,
    "product_id" UUID,
    "type" VARCHAR(30) NOT NULL DEFAULT 'production',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "inspected_qty" DECIMAL(18,4),
    "passed_qty" DECIMAL(18,4),
    "failed_qty" DECIMAL(18,4),
    "inspector_id" UUID,
    "inspected_at" TIMESTAMP(3),
    "notes" TEXT,
    "ai_quality_score" DECIMAL(5,4),
    "ai_defect_pattern" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mfg_quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_quality_check_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "check_id" UUID NOT NULL,
    "parameter" VARCHAR(255) NOT NULL,
    "specification" VARCHAR(500),
    "min_value" DECIMAL(18,4),
    "max_value" DECIMAL(18,4),
    "actual_value" DECIMAL(18,4),
    "unit" VARCHAR(30),
    "result" VARCHAR(20),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_quality_check_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_mrp_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "horizon_days" INTEGER NOT NULL DEFAULT 30,
    "demand_count" INTEGER NOT NULL DEFAULT 0,
    "mo_created" INTEGER NOT NULL DEFAULT 0,
    "req_created" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_mrp_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_mrp_demands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "mrp_run_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "demand_qty" DECIMAL(18,4) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(30) NOT NULL,
    "source_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_mrp_demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfg_mrp_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "mrp_run_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "converted_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfg_mrp_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mfg_bom_templates_tenant_id_idx" ON "mfg_bom_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_bom_templates_tenant_id_deleted_at_idx" ON "mfg_bom_templates"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "mfg_bom_templates_tenant_id_code_version_key" ON "mfg_bom_templates"("tenant_id", "code", "version");

-- CreateIndex
CREATE INDEX "mfg_bom_lines_tenant_id_idx" ON "mfg_bom_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_work_centers_tenant_id_idx" ON "mfg_work_centers"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_work_centers_tenant_id_deleted_at_idx" ON "mfg_work_centers"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "mfg_work_centers_tenant_id_code_key" ON "mfg_work_centers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "mfg_maintenance_logs_tenant_id_idx" ON "mfg_maintenance_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_routings_tenant_id_idx" ON "mfg_routings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfg_routings_tenant_id_code_key" ON "mfg_routings"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "mfg_routing_operations_tenant_id_idx" ON "mfg_routing_operations"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_orders_tenant_id_idx" ON "mfg_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_orders_tenant_id_deleted_at_idx" ON "mfg_orders"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "mfg_orders_tenant_id_number_key" ON "mfg_orders"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "mfg_order_components_tenant_id_idx" ON "mfg_order_components"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_order_operations_tenant_id_idx" ON "mfg_order_operations"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_quality_checks_tenant_id_idx" ON "mfg_quality_checks"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfg_quality_checks_tenant_id_number_key" ON "mfg_quality_checks"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "mfg_quality_check_lines_tenant_id_idx" ON "mfg_quality_check_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_mrp_runs_tenant_id_idx" ON "mfg_mrp_runs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfg_mrp_runs_tenant_id_number_key" ON "mfg_mrp_runs"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "mfg_mrp_demands_tenant_id_idx" ON "mfg_mrp_demands"("tenant_id");

-- CreateIndex
CREATE INDEX "mfg_mrp_recommendations_tenant_id_idx" ON "mfg_mrp_recommendations"("tenant_id");

-- AddForeignKey
ALTER TABLE "mfg_bom_templates" ADD CONSTRAINT "mfg_bom_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_bom_templates" ADD CONSTRAINT "mfg_bom_templates_finished_product_id_fkey" FOREIGN KEY ("finished_product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_bom_templates" ADD CONSTRAINT "mfg_bom_templates_routing_id_fkey" FOREIGN KEY ("routing_id") REFERENCES "mfg_routings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_bom_lines" ADD CONSTRAINT "mfg_bom_lines_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "mfg_bom_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_bom_lines" ADD CONSTRAINT "mfg_bom_lines_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_bom_lines" ADD CONSTRAINT "mfg_bom_lines_parent_line_id_fkey" FOREIGN KEY ("parent_line_id") REFERENCES "mfg_bom_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_maintenance_logs" ADD CONSTRAINT "mfg_maintenance_logs_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "mfg_work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_routings" ADD CONSTRAINT "mfg_routings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_routing_operations" ADD CONSTRAINT "mfg_routing_operations_routing_id_fkey" FOREIGN KEY ("routing_id") REFERENCES "mfg_routings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_routing_operations" ADD CONSTRAINT "mfg_routing_operations_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "mfg_work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_orders" ADD CONSTRAINT "mfg_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_orders" ADD CONSTRAINT "mfg_orders_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "mfg_bom_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_orders" ADD CONSTRAINT "mfg_orders_finished_product_id_fkey" FOREIGN KEY ("finished_product_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_order_components" ADD CONSTRAINT "mfg_order_components_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "mfg_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_order_components" ADD CONSTRAINT "mfg_order_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "inv_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_order_operations" ADD CONSTRAINT "mfg_order_operations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "mfg_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_order_operations" ADD CONSTRAINT "mfg_order_operations_work_center_id_fkey" FOREIGN KEY ("work_center_id") REFERENCES "mfg_work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_quality_checks" ADD CONSTRAINT "mfg_quality_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_quality_checks" ADD CONSTRAINT "mfg_quality_checks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "mfg_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_quality_check_lines" ADD CONSTRAINT "mfg_quality_check_lines_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "mfg_quality_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_mrp_runs" ADD CONSTRAINT "mfg_mrp_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_mrp_demands" ADD CONSTRAINT "mfg_mrp_demands_mrp_run_id_fkey" FOREIGN KEY ("mrp_run_id") REFERENCES "mfg_mrp_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfg_mrp_recommendations" ADD CONSTRAINT "mfg_mrp_recommendations_mrp_run_id_fkey" FOREIGN KEY ("mrp_run_id") REFERENCES "mfg_mrp_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
