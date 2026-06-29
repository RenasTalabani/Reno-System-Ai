-- Phase 69: Marketplace / App Store
CREATE TABLE "mkt_apps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(100) NOT NULL, "description" TEXT, "icon_url" VARCHAR(1000), "category" VARCHAR(100) NOT NULL,
  "version" VARCHAR(30) NOT NULL DEFAULT '1.0.0', "author" VARCHAR(200) NOT NULL,
  "manifest" JSONB NOT NULL DEFAULT '{}', "permissions" JSONB NOT NULL DEFAULT '[]',
  "is_published" BOOLEAN NOT NULL DEFAULT false, "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_free" BOOLEAN NOT NULL DEFAULT true, "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "installs" INTEGER NOT NULL DEFAULT 0, "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mkt_apps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mkt_apps_tenant_slug_key" UNIQUE ("tenant_id","slug"),
  CONSTRAINT "mkt_apps_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "mkt_apps_tenant_category_idx" ON "mkt_apps"("tenant_id","category");

CREATE TABLE "mkt_installs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "app_id" UUID NOT NULL,
  "installed_by" UUID NOT NULL, "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "config" JSONB NOT NULL DEFAULT '{}', "installed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mkt_installs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mkt_installs_tenant_app_key" UNIQUE ("tenant_id","app_id"),
  CONSTRAINT "mkt_installs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "mkt_installs_app_fkey" FOREIGN KEY ("app_id") REFERENCES "mkt_apps"("id")
);
CREATE INDEX "mkt_installs_tenant_id_idx" ON "mkt_installs"("tenant_id");
