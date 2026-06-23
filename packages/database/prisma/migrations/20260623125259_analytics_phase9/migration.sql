-- CreateTable
CREATE TABLE "bi_dashboards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(30) NOT NULL DEFAULT 'custom',
    "module" VARCHAR(50),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB,
    "filters" JSONB,
    "refresh_rate" INTEGER,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_widgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "dashboard_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "module" VARCHAR(50),
    "data_source" VARCHAR(100),
    "config" JSONB,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 4,
    "height" INTEGER NOT NULL DEFAULT 3,
    "refresh_rate" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "columns" JSONB NOT NULL,
    "filters" JSONB,
    "group_by" JSONB,
    "sort_by" JSONB,
    "chart_type" VARCHAR(30),
    "chart_config" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_scheduled_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "cron_expr" VARCHAR(100) NOT NULL,
    "format" VARCHAR(20) NOT NULL DEFAULT 'pdf',
    "recipients" JSONB NOT NULL,
    "subject" VARCHAR(300),
    "message" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_report_exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "scheduled_id" UUID,
    "format" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "row_count" INTEGER,
    "file_size_bytes" INTEGER,
    "file_url" VARCHAR(500),
    "error_message" TEXT,
    "requested_by" UUID,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_company_health_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "overall_score" DECIMAL(5,2) NOT NULL,
    "financial_score" DECIMAL(5,2),
    "sales_score" DECIMAL(5,2),
    "operations_score" DECIMAL(5,2),
    "hr_score" DECIMAL(5,2),
    "inventory_score" DECIMAL(5,2),
    "revenue" DECIMAL(18,2),
    "expenses" DECIMAL(18,2),
    "gross_margin" DECIMAL(8,4),
    "headcount" INTEGER,
    "open_orders" INTEGER,
    "inventory_value" DECIMAL(18,2),
    "ai_trend" VARCHAR(20),
    "ai_risk_level" VARCHAR(20),
    "ai_insights" TEXT,
    "ai_recommendations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_company_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_kpi_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "kpi_key" VARCHAR(100) NOT NULL,
    "period" VARCHAR(20) NOT NULL,
    "period_date" DATE NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "prev_value" DECIMAL(18,4),
    "change_percent" DECIMAL(8,4),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_ai_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "module" VARCHAR(50),
    "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "metric" VARCHAR(100),
    "metric_value" DECIMAL(18,4),
    "confidence" DECIMAL(5,4),
    "actionable" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT,
    "valid_until" TIMESTAMP(3),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboard_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "dashboard_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_share" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_dashboard_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bi_dashboards_tenant_id_idx" ON "bi_dashboards"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bi_dashboards_tenant_id_slug_key" ON "bi_dashboards"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "bi_widgets_tenant_id_dashboard_id_idx" ON "bi_widgets"("tenant_id", "dashboard_id");

-- CreateIndex
CREATE INDEX "bi_reports_tenant_id_idx" ON "bi_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "bi_scheduled_reports_tenant_id_idx" ON "bi_scheduled_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "bi_report_exports_tenant_id_idx" ON "bi_report_exports"("tenant_id");

-- CreateIndex
CREATE INDEX "bi_company_health_scores_tenant_id_idx" ON "bi_company_health_scores"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bi_company_health_scores_tenant_id_snapshot_date_key" ON "bi_company_health_scores"("tenant_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "bi_kpi_snapshots_tenant_id_module_idx" ON "bi_kpi_snapshots"("tenant_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "bi_kpi_snapshots_tenant_id_module_kpi_key_period_period_dat_key" ON "bi_kpi_snapshots"("tenant_id", "module", "kpi_key", "period", "period_date");

-- CreateIndex
CREATE INDEX "bi_ai_insights_tenant_id_idx" ON "bi_ai_insights"("tenant_id");

-- CreateIndex
CREATE INDEX "bi_dashboard_permissions_tenant_id_idx" ON "bi_dashboard_permissions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bi_dashboard_permissions_dashboard_id_user_id_key" ON "bi_dashboard_permissions"("dashboard_id", "user_id");

-- AddForeignKey
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_widgets" ADD CONSTRAINT "bi_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_reports" ADD CONSTRAINT "bi_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_scheduled_reports" ADD CONSTRAINT "bi_scheduled_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_scheduled_reports" ADD CONSTRAINT "bi_scheduled_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bi_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_report_exports" ADD CONSTRAINT "bi_report_exports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bi_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_report_exports" ADD CONSTRAINT "bi_report_exports_scheduled_id_fkey" FOREIGN KEY ("scheduled_id") REFERENCES "bi_scheduled_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_company_health_scores" ADD CONSTRAINT "bi_company_health_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_kpi_snapshots" ADD CONSTRAINT "bi_kpi_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_ai_insights" ADD CONSTRAINT "bi_ai_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_dashboard_permissions" ADD CONSTRAINT "bi_dashboard_permissions_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
