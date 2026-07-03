-- Phase 87: SDK Generator

CREATE TABLE "sdk_api_specs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "version" VARCHAR(30) NOT NULL DEFAULT '1.0.0',
  "spec_format" VARCHAR(30) NOT NULL DEFAULT 'openapi-3.0',
  "spec" JSONB NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "endpoint_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sdk_api_specs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sdk_api_specs_tenant_id_name_version_key" ON "sdk_api_specs"("tenant_id","name","version");
CREATE INDEX "sdk_api_specs_tenant_id_idx" ON "sdk_api_specs"("tenant_id");
ALTER TABLE "sdk_api_specs" ADD CONSTRAINT "sdk_api_specs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sdk_targets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "language" VARCHAR(30) NOT NULL,
  "package_name" VARCHAR(100) NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sdk_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sdk_targets_tenant_id_language_key" ON "sdk_targets"("tenant_id","language");
CREATE INDEX "sdk_targets_tenant_id_idx" ON "sdk_targets"("tenant_id");
ALTER TABLE "sdk_targets" ADD CONSTRAINT "sdk_targets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sdk_builds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "spec_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'queued',
  "artifact_ref" VARCHAR(500),
  "size_kb" INTEGER,
  "build_log" JSONB,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finished_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sdk_builds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sdk_builds_tenant_id_spec_id_idx" ON "sdk_builds"("tenant_id","spec_id");
ALTER TABLE "sdk_builds" ADD CONSTRAINT "sdk_builds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "sdk_builds" ADD CONSTRAINT "sdk_builds_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "sdk_api_specs"("id") ON DELETE CASCADE;
ALTER TABLE "sdk_builds" ADD CONSTRAINT "sdk_builds_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "sdk_targets"("id") ON DELETE CASCADE;

CREATE TABLE "sdk_snippets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "language" VARCHAR(30) NOT NULL,
  "endpoint" VARCHAR(255) NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sdk_snippets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sdk_snippets_tenant_id_language_idx" ON "sdk_snippets"("tenant_id","language");
ALTER TABLE "sdk_snippets" ADD CONSTRAINT "sdk_snippets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sdk_changelogs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "change_type" VARCHAR(30) NOT NULL DEFAULT 'added',
  "summary" VARCHAR(500) NOT NULL,
  "details" TEXT,
  "is_breaking" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sdk_changelogs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sdk_changelogs_tenant_id_version_idx" ON "sdk_changelogs"("tenant_id","version");
ALTER TABLE "sdk_changelogs" ADD CONSTRAINT "sdk_changelogs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sdk_downloads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "build_ref" VARCHAR(255) NOT NULL,
  "language" VARCHAR(30) NOT NULL,
  "version" VARCHAR(30) NOT NULL,
  "downloaded_by" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sdk_downloads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sdk_downloads_tenant_id_language_idx" ON "sdk_downloads"("tenant_id","language");
ALTER TABLE "sdk_downloads" ADD CONSTRAINT "sdk_downloads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;