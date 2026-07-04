-- Phase 98: Release Packaging & Installer

CREATE TABLE "rel_releases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "codename" VARCHAR(100),
  "release_notes" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "ga_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rel_releases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rel_releases_tenant_id_version_key" ON "rel_releases"("tenant_id","version");
CREATE INDEX "rel_releases_tenant_id_idx" ON "rel_releases"("tenant_id");
ALTER TABLE "rel_releases" ADD CONSTRAINT "rel_releases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "rel_artifacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "release_id" UUID NOT NULL,
  "platform" VARCHAR(30) NOT NULL DEFAULT 'docker',
  "artifact_ref" VARCHAR(500) NOT NULL,
  "size_mb" INTEGER NOT NULL DEFAULT 0,
  "checksum" VARCHAR(128),
  "status" VARCHAR(30) NOT NULL DEFAULT 'built',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rel_artifacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rel_artifacts_tenant_id_release_id_idx" ON "rel_artifacts"("tenant_id","release_id");
ALTER TABLE "rel_artifacts" ADD CONSTRAINT "rel_artifacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "rel_artifacts" ADD CONSTRAINT "rel_artifacts_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "rel_releases"("id") ON DELETE CASCADE;

CREATE TABLE "rel_channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "current_version" VARCHAR(30),
  "auto_update" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rel_channels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rel_channels_tenant_id_name_key" ON "rel_channels"("tenant_id","name");
CREATE INDEX "rel_channels_tenant_id_idx" ON "rel_channels"("tenant_id");
ALTER TABLE "rel_channels" ADD CONSTRAINT "rel_channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "rel_installations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "site_name" VARCHAR(150) NOT NULL,
  "install_type" VARCHAR(30) NOT NULL DEFAULT 'docker-compose',
  "version" VARCHAR(30) NOT NULL,
  "channel" VARCHAR(50) NOT NULL DEFAULT 'stable',
  "status" VARCHAR(30) NOT NULL DEFAULT 'installing',
  "steps" JSONB,
  "health_check" JSONB,
  "installed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rel_installations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rel_installations_tenant_id_idx" ON "rel_installations"("tenant_id");
ALTER TABLE "rel_installations" ADD CONSTRAINT "rel_installations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "rel_deploy_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "release_id" UUID NOT NULL,
  "environment" VARCHAR(30) NOT NULL DEFAULT 'staging',
  "strategy" VARCHAR(30) NOT NULL DEFAULT 'blue-green',
  "status" VARCHAR(30) NOT NULL DEFAULT 'planned',
  "is_dry_run" BOOLEAN NOT NULL DEFAULT true,
  "approved_by" VARCHAR(100),
  "plan_steps" JSONB,
  "executed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rel_deploy_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rel_deploy_plans_tenant_id_release_id_idx" ON "rel_deploy_plans"("tenant_id","release_id");
ALTER TABLE "rel_deploy_plans" ADD CONSTRAINT "rel_deploy_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "rel_deploy_plans" ADD CONSTRAINT "rel_deploy_plans_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "rel_releases"("id") ON DELETE CASCADE;

CREATE TABLE "rel_checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "release_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "category" VARCHAR(30) NOT NULL DEFAULT 'quality',
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "is_done" BOOLEAN NOT NULL DEFAULT false,
  "done_by" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "rel_checklist_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rel_checklist_items_tenant_id_release_id_idx" ON "rel_checklist_items"("tenant_id","release_id");
ALTER TABLE "rel_checklist_items" ADD CONSTRAINT "rel_checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "rel_checklist_items" ADD CONSTRAINT "rel_checklist_items_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "rel_releases"("id") ON DELETE CASCADE;