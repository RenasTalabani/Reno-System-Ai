-- Phase 85: Secrets Management

CREATE TABLE "sm_vaults" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'unlocked',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sm_vaults_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sm_vaults_tenant_id_name_key" ON "sm_vaults"("tenant_id","name");
CREATE INDEX "sm_vaults_tenant_id_idx" ON "sm_vaults"("tenant_id");
ALTER TABLE "sm_vaults" ADD CONSTRAINT "sm_vaults_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sm_secrets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vault_id" UUID NOT NULL,
  "key" VARCHAR(200) NOT NULL,
  "secret_type" VARCHAR(30) NOT NULL DEFAULT 'generic',
  "current_version" INTEGER NOT NULL DEFAULT 1,
  "last_rotated_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sm_secrets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sm_secrets_tenant_id_vault_id_key_key" ON "sm_secrets"("tenant_id","vault_id","key");
CREATE INDEX "sm_secrets_tenant_id_vault_id_idx" ON "sm_secrets"("tenant_id","vault_id");
ALTER TABLE "sm_secrets" ADD CONSTRAINT "sm_secrets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "sm_secrets" ADD CONSTRAINT "sm_secrets_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "sm_vaults"("id") ON DELETE CASCADE;

CREATE TABLE "sm_secret_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "secret_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "cipher_text" TEXT NOT NULL,
  "created_by" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sm_secret_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sm_secret_versions_secret_id_version_key" ON "sm_secret_versions"("secret_id","version");
CREATE INDEX "sm_secret_versions_tenant_id_secret_id_idx" ON "sm_secret_versions"("tenant_id","secret_id");
ALTER TABLE "sm_secret_versions" ADD CONSTRAINT "sm_secret_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "sm_secret_versions" ADD CONSTRAINT "sm_secret_versions_secret_id_fkey" FOREIGN KEY ("secret_id") REFERENCES "sm_secrets"("id") ON DELETE CASCADE;

CREATE TABLE "sm_access_grants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "secret_id" UUID NOT NULL,
  "grantee_type" VARCHAR(30) NOT NULL DEFAULT 'user',
  "grantee_ref" VARCHAR(200) NOT NULL,
  "permission" VARCHAR(20) NOT NULL DEFAULT 'read',
  "expires_at" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sm_access_grants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sm_access_grants_tenant_id_secret_id_idx" ON "sm_access_grants"("tenant_id","secret_id");
ALTER TABLE "sm_access_grants" ADD CONSTRAINT "sm_access_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "sm_access_grants" ADD CONSTRAINT "sm_access_grants_secret_id_fkey" FOREIGN KEY ("secret_id") REFERENCES "sm_secrets"("id") ON DELETE CASCADE;

CREATE TABLE "sm_rotation_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "secret_type" VARCHAR(30) NOT NULL DEFAULT 'generic',
  "interval_days" INTEGER NOT NULL DEFAULT 90,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_run_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sm_rotation_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sm_rotation_policies_tenant_id_idx" ON "sm_rotation_policies"("tenant_id");
ALTER TABLE "sm_rotation_policies" ADD CONSTRAINT "sm_rotation_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sm_access_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "secret_ref" VARCHAR(255) NOT NULL,
  "actor" VARCHAR(100) NOT NULL,
  "action" VARCHAR(30) NOT NULL,
  "outcome" VARCHAR(20) NOT NULL DEFAULT 'allowed',
  "context" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sm_access_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sm_access_logs_tenant_id_secret_ref_idx" ON "sm_access_logs"("tenant_id","secret_ref");
ALTER TABLE "sm_access_logs" ADD CONSTRAINT "sm_access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;