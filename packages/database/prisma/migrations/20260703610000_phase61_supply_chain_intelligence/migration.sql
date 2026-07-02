CREATE TABLE "sci_suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "country" TEXT,
  "category" TEXT,
  "lead_time_days" INTEGER NOT NULL DEFAULT 7,
  "on_time_delivery" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_risk_level" TEXT NOT NULL DEFAULT 'low',
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sci_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sci_suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sci_suppliers_tenant_id_idx" ON "sci_suppliers"("tenant_id");

CREATE TABLE "sci_shipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "tracking_number" TEXT,
  "origin" TEXT,
  "destination" TEXT,
  "carrier" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "scheduled_date" TIMESTAMPTZ NOT NULL,
  "actual_date" TIMESTAMPTZ,
  "ai_delay_risk" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_eta" TIMESTAMPTZ,
  "ai_insights" JSONB NOT NULL DEFAULT '[]',
  "items" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sci_shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sci_shipments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "sci_shipments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "sci_suppliers"("id") ON DELETE CASCADE
);
CREATE INDEX "sci_shipments_tenant_id_idx" ON "sci_shipments"("tenant_id");

CREATE TABLE "sci_demand_forecasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "sku_code" TEXT NOT NULL,
  "sku_name" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "actual_demand" DOUBLE PRECISION,
  "ai_demand" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "reorder_point" DOUBLE PRECISION,
  "safety_stock" DOUBLE PRECISION,
  "ai_summary" TEXT,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sci_demand_forecasts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sci_demand_forecasts_tenant_sku_period_key" UNIQUE ("tenant_id", "sku_code", "period"),
  CONSTRAINT "sci_demand_forecasts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sci_demand_forecasts_tenant_id_idx" ON "sci_demand_forecasts"("tenant_id");

CREATE TABLE "sci_inventory_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "sku_code" TEXT NOT NULL,
  "sku_name" TEXT NOT NULL,
  "alert_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "current_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_suggestion" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sci_inventory_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sci_inventory_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sci_inventory_alerts_tenant_id_idx" ON "sci_inventory_alerts"("tenant_id");