-- Phase 88: Extension Store

CREATE TABLE "ext_extensions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "ext_type" VARCHAR(30) NOT NULL DEFAULT 'widget',
  "description" TEXT,
  "author" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "latest_version" VARCHAR(30) NOT NULL DEFAULT '0.1.0',
  "install_count" INTEGER NOT NULL DEFAULT 0,
  "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ext_extensions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ext_extensions_tenant_id_slug_key" ON "ext_extensions"("tenant_id","slug");
CREATE INDEX "ext_extensions_tenant_id_idx" ON "ext_extensions"("tenant_id");
ALTER TABLE "ext_extensions" ADD CONSTRAINT "ext_extensions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ext_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "extension_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "changelog" TEXT,
  "bundle" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ext_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ext_versions_extension_id_version_key" ON "ext_versions"("extension_id","version");
CREATE INDEX "ext_versions_tenant_id_extension_id_idx" ON "ext_versions"("tenant_id","extension_id");
ALTER TABLE "ext_versions" ADD CONSTRAINT "ext_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ext_versions" ADD CONSTRAINT "ext_versions_extension_id_fkey" FOREIGN KEY ("extension_id") REFERENCES "ext_extensions"("id") ON DELETE CASCADE;

CREATE TABLE "ext_installs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "extension_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "placement" VARCHAR(50) NOT NULL DEFAULT 'dashboard',
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "settings" JSONB,
  "installed_by" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ext_installs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ext_installs_tenant_id_extension_id_placement_key" ON "ext_installs"("tenant_id","extension_id","placement");
CREATE INDEX "ext_installs_tenant_id_idx" ON "ext_installs"("tenant_id");
ALTER TABLE "ext_installs" ADD CONSTRAINT "ext_installs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ext_installs" ADD CONSTRAINT "ext_installs_extension_id_fkey" FOREIGN KEY ("extension_id") REFERENCES "ext_extensions"("id") ON DELETE CASCADE;

CREATE TABLE "ext_themes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "colors" JSONB NOT NULL,
  "typography" JSONB,
  "is_dark" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "author" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ext_themes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ext_themes_tenant_id_name_key" ON "ext_themes"("tenant_id","name");
CREATE INDEX "ext_themes_tenant_id_idx" ON "ext_themes"("tenant_id");
ALTER TABLE "ext_themes" ADD CONSTRAINT "ext_themes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ext_widgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "widget_type" VARCHAR(30) NOT NULL DEFAULT 'chart',
  "data_source" VARCHAR(255),
  "config" JSONB,
  "placement" VARCHAR(50) NOT NULL DEFAULT 'dashboard',
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ext_widgets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ext_widgets_tenant_id_placement_idx" ON "ext_widgets"("tenant_id","placement");
ALTER TABLE "ext_widgets" ADD CONSTRAINT "ext_widgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ext_ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "extension_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "comment" TEXT,
  "rater" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ext_ratings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ext_ratings_tenant_id_extension_id_idx" ON "ext_ratings"("tenant_id","extension_id");
ALTER TABLE "ext_ratings" ADD CONSTRAINT "ext_ratings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ext_ratings" ADD CONSTRAINT "ext_ratings_extension_id_fkey" FOREIGN KEY ("extension_id") REFERENCES "ext_extensions"("id") ON DELETE CASCADE;