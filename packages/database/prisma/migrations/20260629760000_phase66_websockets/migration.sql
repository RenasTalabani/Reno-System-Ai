-- Phase 66: Real-time WebSockets & Presence
CREATE TABLE "ws_channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "name" VARCHAR(200) NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'broadcast', "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ws_channels_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ws_channels_tenant_name_idx" ON "ws_channels"("tenant_id","name");

CREATE TABLE "ws_presence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'online', "last_seen" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "socket_id" VARCHAR(200), "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "ws_presence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ws_presence_tenant_user_key" UNIQUE ("tenant_id","user_id")
);
CREATE INDEX "ws_presence_tenant_id_idx" ON "ws_presence"("tenant_id");
