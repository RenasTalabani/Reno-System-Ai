-- Phase 86: Plugin Marketplace

CREATE TABLE "plg_plugins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL DEFAULT 'integration',
  "author" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "install_count" INTEGER NOT NULL DEFAULT 0,
  "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "latest_version" VARCHAR(30) NOT NULL DEFAULT '0.1.0',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plg_plugins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plg_plugins_tenant_id_slug_key" ON "plg_plugins"("tenant_id","slug");
CREATE INDEX "plg_plugins_tenant_id_idx" ON "plg_plugins"("tenant_id");
ALTER TABLE "plg_plugins" ADD CONSTRAINT "plg_plugins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "plg_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plugin_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "changelog" TEXT,
  "manifest" JSONB,
  "status" VARCHAR(30) NOT NULL DEFAULT 'published',
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plg_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plg_versions_plugin_id_version_key" ON "plg_versions"("plugin_id","version");
CREATE INDEX "plg_versions_tenant_id_plugin_id_idx" ON "plg_versions"("tenant_id","plugin_id");
ALTER TABLE "plg_versions" ADD CONSTRAINT "plg_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "plg_versions" ADD CONSTRAINT "plg_versions_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plg_plugins"("id") ON DELETE CASCADE;

CREATE TABLE "plg_installations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plugin_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "config" JSONB,
  "installed_by" VARCHAR(100),
  "installed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plg_installations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plg_installations_tenant_id_plugin_id_key" ON "plg_installations"("tenant_id","plugin_id");
CREATE INDEX "plg_installations_tenant_id_idx" ON "plg_installations"("tenant_id");
ALTER TABLE "plg_installations" ADD CONSTRAINT "plg_installations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "plg_installations" ADD CONSTRAINT "plg_installations_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plg_plugins"("id") ON DELETE CASCADE;

CREATE TABLE "plg_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plugin_id" UUID NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "comment" TEXT,
  "reviewer" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plg_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "plg_reviews_tenant_id_plugin_id_idx" ON "plg_reviews"("tenant_id","plugin_id");
ALTER TABLE "plg_reviews" ADD CONSTRAINT "plg_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "plg_reviews" ADD CONSTRAINT "plg_reviews_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plg_plugins"("id") ON DELETE CASCADE;

CREATE TABLE "plg_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plugin_id" UUID NOT NULL,
  "scope" VARCHAR(100) NOT NULL,
  "reason" VARCHAR(255),
  "is_granted" BOOLEAN NOT NULL DEFAULT false,
  "granted_by" VARCHAR(100),
  "granted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plg_permissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "plg_permissions_tenant_id_plugin_id_idx" ON "plg_permissions"("tenant_id","plugin_id");
ALTER TABLE "plg_permissions" ADD CONSTRAINT "plg_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "plg_permissions" ADD CONSTRAINT "plg_permissions_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plg_plugins"("id") ON DELETE CASCADE;

CREATE TABLE "plg_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plugin_ref" VARCHAR(100) NOT NULL,
  "event_type" VARCHAR(50) NOT NULL,
  "payload" JSONB,
  "status" VARCHAR(30) NOT NULL DEFAULT 'delivered',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plg_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "plg_webhook_events_tenant_id_plugin_ref_idx" ON "plg_webhook_events"("tenant_id","plugin_ref");
ALTER TABLE "plg_webhook_events" ADD CONSTRAINT "plg_webhook_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;