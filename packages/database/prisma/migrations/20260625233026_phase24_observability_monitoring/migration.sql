-- CreateTable
CREATE TABLE "obs_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "category" VARCHAR(100) NOT NULL,
    "condition" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "fired_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "fired_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "obs_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "alert_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "category" VARCHAR(100) NOT NULL,
    "affected_area" VARCHAR(200),
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "root_cause" TEXT,
    "ai_analysis" TEXT,
    "ai_recommendations" JSONB,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "obs_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_metric_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" VARCHAR(10) NOT NULL DEFAULT '1m',
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obs_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obs_service_dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_service" VARCHAR(100) NOT NULL,
    "to_service" VARCHAR(100) NOT NULL,
    "dep_type" VARCHAR(50) NOT NULL DEFAULT 'http',
    "is_healthy" BOOLEAN NOT NULL DEFAULT true,
    "latency_ms" INTEGER,
    "last_checked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obs_service_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "obs_alerts_tenant_id_severity_idx" ON "obs_alerts"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "obs_alerts_tenant_id_is_active_fired_at_idx" ON "obs_alerts"("tenant_id", "is_active", "fired_at");

-- CreateIndex
CREATE INDEX "obs_incidents_tenant_id_status_severity_idx" ON "obs_incidents"("tenant_id", "status", "severity");

-- CreateIndex
CREATE INDEX "obs_incidents_tenant_id_detected_at_idx" ON "obs_incidents"("tenant_id", "detected_at");

-- CreateIndex
CREATE INDEX "obs_metric_snapshots_tenant_id_snapshot_at_idx" ON "obs_metric_snapshots"("tenant_id", "snapshot_at");

-- CreateIndex
CREATE INDEX "obs_metric_snapshots_snapshot_at_idx" ON "obs_metric_snapshots"("snapshot_at");

-- CreateIndex
CREATE UNIQUE INDEX "obs_service_dependencies_from_service_to_service_key" ON "obs_service_dependencies"("from_service", "to_service");

-- AddForeignKey
ALTER TABLE "obs_alerts" ADD CONSTRAINT "obs_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_incidents" ADD CONSTRAINT "obs_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_incidents" ADD CONSTRAINT "obs_incidents_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "obs_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obs_metric_snapshots" ADD CONSTRAINT "obs_metric_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
