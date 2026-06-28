-- Phase 56: Asset Management

CREATE TABLE "ast_assets" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "asset_tag"       VARCHAR(100) NOT NULL,
  "name"            VARCHAR(300) NOT NULL,
  "category"        VARCHAR(100),
  "type"            VARCHAR(100),
  "status"          VARCHAR(20) NOT NULL DEFAULT 'active',
  "condition"       VARCHAR(20) NOT NULL DEFAULT 'good',
  "serial_number"   VARCHAR(200),
  "manufacturer"    VARCHAR(200),
  "model"           VARCHAR(200),
  "location"        VARCHAR(500),
  "assigned_to"     UUID,
  "purchase_date"   DATE,
  "purchase_price"  DECIMAL(18,2),
  "warranty_expiry" DATE,
  "next_service"    DATE,
  "depreciation_yrs" SMALLINT   NOT NULL DEFAULT 5,
  "notes"           TEXT,
  "metadata"        JSONB       NOT NULL DEFAULT '{}',
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ast_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ast_assets_tenant_tag_idx" ON "ast_assets"("tenant_id","asset_tag");
CREATE INDEX "ast_assets_tenant_status_idx" ON "ast_assets"("tenant_id","status");
CREATE INDEX "ast_assets_assigned_to_idx" ON "ast_assets"("assigned_to");
ALTER TABLE "ast_assets" ADD CONSTRAINT "ast_assets_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ast_maintenance" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "asset_id"    UUID        NOT NULL,
  "type"        VARCHAR(50) NOT NULL DEFAULT 'routine',
  "status"      VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  "description" TEXT,
  "cost"        DECIMAL(18,2),
  "vendor"      VARCHAR(200),
  "scheduled_at" DATE,
  "completed_at" TIMESTAMPTZ,
  "technician"  VARCHAR(200),
  "notes"       TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ast_maintenance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ast_maintenance_asset_idx" ON "ast_maintenance"("asset_id","status");
ALTER TABLE "ast_maintenance" ADD CONSTRAINT "ast_maintenance_asset_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "ast_assets"("id") ON DELETE CASCADE;

CREATE TABLE "ast_assignments" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "asset_id"    UUID        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "assigned_by" UUID,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "returned_at" TIMESTAMPTZ,
  "notes"       TEXT,
  CONSTRAINT "ast_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ast_assignments_asset_idx" ON "ast_assignments"("asset_id");
CREATE INDEX "ast_assignments_user_idx" ON "ast_assignments"("user_id");
ALTER TABLE "ast_assignments" ADD CONSTRAINT "ast_assignments_asset_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "ast_assets"("id") ON DELETE CASCADE;
