-- Phase 59: API Gateway & Developer Portal

CREATE TABLE "apigw_api_keys" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "name"          VARCHAR(200) NOT NULL,
  "key_prefix"    VARCHAR(10) NOT NULL,
  "key_hash"      VARCHAR(64) NOT NULL,
  "status"        VARCHAR(20) NOT NULL DEFAULT 'active',
  "scopes"        JSONB       NOT NULL DEFAULT '[]',
  "rate_limit"    INTEGER     NOT NULL DEFAULT 1000,
  "rate_window"   VARCHAR(10) NOT NULL DEFAULT '1h',
  "expires_at"    TIMESTAMPTZ,
  "last_used_at"  TIMESTAMPTZ,
  "total_calls"   BIGINT      NOT NULL DEFAULT 0,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apigw_api_keys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "apigw_api_keys_tenant_idx" ON "apigw_api_keys"("tenant_id","status");
CREATE UNIQUE INDEX "apigw_api_keys_hash_idx" ON "apigw_api_keys"("key_hash");
ALTER TABLE "apigw_api_keys" ADD CONSTRAINT "apigw_api_keys_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "apigw_webhooks" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "url"         VARCHAR(500) NOT NULL,
  "events"      JSONB       NOT NULL DEFAULT '[]',
  "status"      VARCHAR(20) NOT NULL DEFAULT 'active',
  "secret"      VARCHAR(64),
  "headers"     JSONB       NOT NULL DEFAULT '{}',
  "retry_count" SMALLINT    NOT NULL DEFAULT 3,
  "last_fired"  TIMESTAMPTZ,
  "last_status" SMALLINT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apigw_webhooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "apigw_webhooks_tenant_idx" ON "apigw_webhooks"("tenant_id","status");
ALTER TABLE "apigw_webhooks" ADD CONSTRAINT "apigw_webhooks_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "apigw_usage_logs" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "key_id"      UUID,
  "method"      VARCHAR(10) NOT NULL,
  "path"        VARCHAR(500) NOT NULL,
  "status_code" SMALLINT    NOT NULL,
  "duration_ms" INTEGER     NOT NULL,
  "ip"          VARCHAR(45),
  "user_agent"  VARCHAR(500),
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "apigw_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "apigw_usage_logs_tenant_time_idx" ON "apigw_usage_logs"("tenant_id","occurred_at");
CREATE INDEX "apigw_usage_logs_key_idx" ON "apigw_usage_logs"("key_id","occurred_at");
ALTER TABLE "apigw_usage_logs" ADD CONSTRAINT "apigw_usage_logs_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
