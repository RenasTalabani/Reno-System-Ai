-- Phase 98: Enterprise SSO & Identity
CREATE TABLE IF NOT EXISTS "scim_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "token_hash" VARCHAR(200) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "scim_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scim_tokens_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "scim_tokens_tenant_id_idx" ON "scim_tokens"("tenant_id");

CREATE TABLE IF NOT EXISTS "dir_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "external_id" VARCHAR(200),
  "assigned_roles" JSONB NOT NULL DEFAULT '[]',
  "member_count" INTEGER NOT NULL DEFAULT 0,
  "synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dir_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dir_groups_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "dir_groups_tenant_id_idx" ON "dir_groups"("tenant_id");