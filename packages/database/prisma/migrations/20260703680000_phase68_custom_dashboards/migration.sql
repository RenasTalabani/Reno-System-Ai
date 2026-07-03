-- Phase 68: Custom Dashboards Platform
-- Migration: 20260703680000_phase68_custom_dashboards

CREATE TABLE "cdb_dashboards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "owner_id" UUID NOT NULL,
  "icon" TEXT,
  "theme" TEXT NOT NULL DEFAULT 'default',
  "columns" INTEGER NOT NULL DEFAULT 12,
  "layout" JSONB NOT NULL DEFAULT '[]',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_dashboards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_widgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dashboard_id" UUID NOT NULL,
  "definition_key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "x" INTEGER NOT NULL DEFAULT 0,
  "y" INTEGER NOT NULL DEFAULT 0,
  "w" INTEGER NOT NULL DEFAULT 4,
  "h" INTEGER NOT NULL DEFAULT 3,
  "config" JSONB NOT NULL DEFAULT '{}',
  "data_cache" JSONB NOT NULL DEFAULT '{}',
  "last_data_fetch" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_widgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_widget_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'kpi',
  "chart_type" TEXT NOT NULL DEFAULT 'number',
  "data_source" TEXT NOT NULL,
  "default_config" JSONB NOT NULL DEFAULT '{}',
  "schema" JSONB NOT NULL DEFAULT '{}',
  "is_built_in" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_widget_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_dashboard_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dashboard_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "label" TEXT,
  "snapshot" JSONB NOT NULL DEFAULT '{}',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_dashboard_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_dashboard_shares" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dashboard_id" UUID NOT NULL,
  "shared_with_user_id" UUID,
  "shared_with_role" TEXT,
  "can_edit" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_dashboard_shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_dashboard_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "department" TEXT NOT NULL,
  "icon" TEXT,
  "layout" JSONB NOT NULL DEFAULT '[]',
  "widgets" JSONB NOT NULL DEFAULT '[]',
  "is_built_in" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_dashboard_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_dashboard_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dashboard_id" UUID NOT NULL,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "avg_load_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "last_viewed_at" TIMESTAMPTZ,
  "viewer_count" INTEGER NOT NULL DEFAULT 0,
  "widget_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_dashboard_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cdb_ai_recommendations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dashboard_id" UUID NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'widget',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "is_applied" BOOLEAN NOT NULL DEFAULT false,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdb_ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "cdb_dashboards" ADD CONSTRAINT "cdb_dashboards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_widgets" ADD CONSTRAINT "cdb_widgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_widgets" ADD CONSTRAINT "cdb_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "cdb_dashboards"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_dashboard_versions" ADD CONSTRAINT "cdb_dashboard_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_dashboard_versions" ADD CONSTRAINT "cdb_dashboard_versions_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "cdb_dashboards"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_dashboard_shares" ADD CONSTRAINT "cdb_dashboard_shares_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_dashboard_shares" ADD CONSTRAINT "cdb_dashboard_shares_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "cdb_dashboards"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_dashboard_templates" ADD CONSTRAINT "cdb_dashboard_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_dashboard_metrics" ADD CONSTRAINT "cdb_dashboard_metrics_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "cdb_dashboards"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_ai_recommendations" ADD CONSTRAINT "cdb_ai_recommendations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdb_ai_recommendations" ADD CONSTRAINT "cdb_ai_recommendations_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "cdb_dashboards"("id") ON DELETE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX "cdb_widget_definitions_key_unique" ON "cdb_widget_definitions"("key");
CREATE UNIQUE INDEX "cdb_dashboard_versions_dashboard_version_unique" ON "cdb_dashboard_versions"("dashboard_id", "version");
CREATE UNIQUE INDEX "cdb_dashboard_metrics_dashboard_id_unique" ON "cdb_dashboard_metrics"("dashboard_id");

-- Indexes
CREATE INDEX "cdb_dashboards_tenant_id_idx" ON "cdb_dashboards"("tenant_id");
CREATE INDEX "cdb_dashboards_tenant_owner_idx" ON "cdb_dashboards"("tenant_id", "owner_id");
CREATE INDEX "cdb_widgets_tenant_id_idx" ON "cdb_widgets"("tenant_id");
CREATE INDEX "cdb_widgets_dashboard_id_idx" ON "cdb_widgets"("dashboard_id");
CREATE INDEX "cdb_dashboard_versions_tenant_id_idx" ON "cdb_dashboard_versions"("tenant_id");
CREATE INDEX "cdb_dashboard_shares_tenant_id_idx" ON "cdb_dashboard_shares"("tenant_id");
CREATE INDEX "cdb_dashboard_templates_tenant_id_idx" ON "cdb_dashboard_templates"("tenant_id");
CREATE INDEX "cdb_ai_recommendations_tenant_id_idx" ON "cdb_ai_recommendations"("tenant_id");