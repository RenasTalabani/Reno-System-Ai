-- Phase 68: Advanced Security (2FA, Sessions, IP Rules)
CREATE TABLE IF NOT EXISTS "sec_two_fa_secrets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "secret" VARCHAR(500) NOT NULL, "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "backup_codes" JSONB NOT NULL DEFAULT '[]', "enabled_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sec_two_fa_secrets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sec_two_fa_secrets_tenant_user_key" UNIQUE ("tenant_id","user_id"),
  CONSTRAINT "sec_two_fa_secrets_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "sec_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "token" VARCHAR(500) NOT NULL, "device_info" JSONB NOT NULL DEFAULT '{}', "ip_address" VARCHAR(50) NOT NULL,
  "user_agent" VARCHAR(1000), "is_trusted" BOOLEAN NOT NULL DEFAULT false,
  "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sec_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sec_sessions_token_key" UNIQUE ("token"),
  CONSTRAINT "sec_sessions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sec_sessions_tenant_user_idx" ON "sec_sessions"("tenant_id","user_id");
CREATE INDEX "sec_sessions_tenant_expires_idx" ON "sec_sessions"("tenant_id","expires_at");

CREATE TABLE IF NOT EXISTS "sec_ip_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "cidr" VARCHAR(50) NOT NULL,
  "type" VARCHAR(10) NOT NULL DEFAULT 'allow', "description" VARCHAR(300), "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sec_ip_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sec_ip_rules_tenant_cidr_type_key" UNIQUE ("tenant_id","cidr","type"),
  CONSTRAINT "sec_ip_rules_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sec_ip_rules_tenant_id_idx" ON "sec_ip_rules"("tenant_id");
