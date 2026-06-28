-- Phase 48: Advanced Mobile Features

CREATE TABLE "mob_push_tokens" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "token"       TEXT        NOT NULL,
  "platform"    VARCHAR(10) NOT NULL DEFAULT 'android',
  "device_name" VARCHAR(200),
  "app_version" VARCHAR(50),
  "is_active"   BOOLEAN     NOT NULL DEFAULT true,
  "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mob_push_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mob_push_tokens_user_token_idx" ON "mob_push_tokens"("user_id", "token");
CREATE INDEX "mob_push_tokens_tenant_idx" ON "mob_push_tokens"("tenant_id");
ALTER TABLE "mob_push_tokens" ADD CONSTRAINT "mob_push_tokens_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mob_push_notifications" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "user_id"     UUID,
  "title"       VARCHAR(255) NOT NULL,
  "body"        TEXT        NOT NULL,
  "data"        JSONB       NOT NULL DEFAULT '{}',
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "sent_count"  INTEGER     NOT NULL DEFAULT 0,
  "sent_at"     TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mob_push_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mob_push_notifications_tenant_idx" ON "mob_push_notifications"("tenant_id", "created_at" DESC);
ALTER TABLE "mob_push_notifications" ADD CONSTRAINT "mob_push_notifications_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mob_offline_queue" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "operation"   VARCHAR(10) NOT NULL,
  "endpoint"    VARCHAR(500) NOT NULL,
  "payload"     JSONB       NOT NULL DEFAULT '{}',
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "retries"     SMALLINT    NOT NULL DEFAULT 0,
  "error"       TEXT,
  "processed_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mob_offline_queue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mob_offline_queue_user_idx" ON "mob_offline_queue"("user_id", "status", "created_at");
ALTER TABLE "mob_offline_queue" ADD CONSTRAINT "mob_offline_queue_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mob_biometric_keys" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "user_id"       UUID        NOT NULL,
  "device_id"     VARCHAR(255) NOT NULL,
  "public_key"    TEXT        NOT NULL,
  "key_algorithm" VARCHAR(30) NOT NULL DEFAULT 'ES256',
  "last_used_at"  TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mob_biometric_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mob_biometric_keys_user_device_idx" ON "mob_biometric_keys"("user_id", "device_id");
ALTER TABLE "mob_biometric_keys" ADD CONSTRAINT "mob_biometric_keys_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
