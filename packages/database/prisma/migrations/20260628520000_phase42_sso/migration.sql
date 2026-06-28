-- Phase 42: SSO & Enterprise Identity
-- SAML 2.0, OIDC, Azure AD, Google Workspace

CREATE TABLE "sso_providers" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "name"            VARCHAR(100) NOT NULL,
  "type"            VARCHAR(30) NOT NULL, -- saml, oidc, azure_ad, google
  "is_enabled"      BOOLEAN     NOT NULL DEFAULT false,
  "is_default"      BOOLEAN     NOT NULL DEFAULT false,
  "config"          JSONB       NOT NULL DEFAULT '{}',
  "attribute_map"   JSONB       NOT NULL DEFAULT '{}',
  "auto_provision"  BOOLEAN     NOT NULL DEFAULT true,
  "auto_assign_roles" JSONB     NOT NULL DEFAULT '[]',
  "domain_hint"     VARCHAR(255),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_by"      UUID,
  CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sso_providers_tenant_id_idx" ON "sso_providers"("tenant_id");
CREATE INDEX "sso_providers_tenant_type_idx" ON "sso_providers"("tenant_id", "type");
ALTER TABLE "sso_providers" ADD CONSTRAINT "sso_providers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "sso_sessions" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "provider_id"   UUID        NOT NULL,
  "user_id"       UUID,
  "external_id"   VARCHAR(500) NOT NULL,
  "email"         VARCHAR(255) NOT NULL,
  "name"          VARCHAR(255),
  "groups"        JSONB       NOT NULL DEFAULT '[]',
  "attributes"    JSONB       NOT NULL DEFAULT '{}',
  "provisioned"   BOOLEAN     NOT NULL DEFAULT false,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_login_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "sso_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sso_sessions_provider_external_idx" ON "sso_sessions"("provider_id", "external_id");
CREATE INDEX "sso_sessions_tenant_email_idx" ON "sso_sessions"("tenant_id", "email");
ALTER TABLE "sso_sessions" ADD CONSTRAINT "sso_sessions_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "sso_providers"("id") ON DELETE CASCADE;

CREATE TABLE "sso_audit_logs" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "provider_id" UUID,
  "user_id"     UUID,
  "event"       VARCHAR(50) NOT NULL,
  "email"       VARCHAR(255),
  "ip_address"  VARCHAR(45),
  "user_agent"  TEXT,
  "success"     BOOLEAN     NOT NULL DEFAULT true,
  "error"       TEXT,
  "metadata"    JSONB,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "sso_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sso_audit_logs_tenant_created_idx" ON "sso_audit_logs"("tenant_id", "created_at" DESC);
CREATE INDEX "sso_audit_logs_tenant_user_idx" ON "sso_audit_logs"("tenant_id", "user_id");
