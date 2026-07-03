-- Phase 90: Developer Console

CREATE TABLE "dev_apps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "app_type" VARCHAR(30) NOT NULL DEFAULT 'api-integration',
  "description" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'development',
  "owner_ref" VARCHAR(100),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dev_apps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dev_apps_tenant_id_idx" ON "dev_apps"("tenant_id");
ALTER TABLE "dev_apps" ADD CONSTRAINT "dev_apps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "dev_sandboxes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "app_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'stopped',
  "seed_data" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dev_sandboxes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dev_sandboxes_tenant_id_app_id_idx" ON "dev_sandboxes"("tenant_id","app_id");
ALTER TABLE "dev_sandboxes" ADD CONSTRAINT "dev_sandboxes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dev_sandboxes" ADD CONSTRAINT "dev_sandboxes_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "dev_apps"("id") ON DELETE CASCADE;

CREATE TABLE "dev_log_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "app_id" UUID NOT NULL,
  "level" VARCHAR(20) NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "context" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dev_log_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dev_log_entries_tenant_id_app_id_level_idx" ON "dev_log_entries"("tenant_id","app_id","level");
ALTER TABLE "dev_log_entries" ADD CONSTRAINT "dev_log_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dev_log_entries" ADD CONSTRAINT "dev_log_entries_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "dev_apps"("id") ON DELETE CASCADE;

CREATE TABLE "dev_test_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "app_id" UUID NOT NULL,
  "suite_name" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'running',
  "total_tests" INTEGER NOT NULL DEFAULT 0,
  "passed_tests" INTEGER NOT NULL DEFAULT 0,
  "failed_tests" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER,
  "results" JSONB,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finished_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dev_test_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dev_test_runs_tenant_id_app_id_idx" ON "dev_test_runs"("tenant_id","app_id");
ALTER TABLE "dev_test_runs" ADD CONSTRAINT "dev_test_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dev_test_runs" ADD CONSTRAINT "dev_test_runs_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "dev_apps"("id") ON DELETE CASCADE;

CREATE TABLE "dev_env_vars" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "app_id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "value_sealed" TEXT NOT NULL,
  "is_secret" BOOLEAN NOT NULL DEFAULT false,
  "environment" VARCHAR(30) NOT NULL DEFAULT 'development',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dev_env_vars_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dev_env_vars_app_id_environment_key_key" ON "dev_env_vars"("app_id","environment","key");
CREATE INDEX "dev_env_vars_tenant_id_app_id_idx" ON "dev_env_vars"("tenant_id","app_id");
ALTER TABLE "dev_env_vars" ADD CONSTRAINT "dev_env_vars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "dev_env_vars" ADD CONSTRAINT "dev_env_vars_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "dev_apps"("id") ON DELETE CASCADE;

CREATE TABLE "dev_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "app_ref" VARCHAR(100) NOT NULL,
  "actor" VARCHAR(100) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "detail" VARCHAR(500),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dev_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dev_activities_tenant_id_app_ref_idx" ON "dev_activities"("tenant_id","app_ref");
ALTER TABLE "dev_activities" ADD CONSTRAINT "dev_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;