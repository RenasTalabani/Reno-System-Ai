-- Phase 27: Developer Platform
-- Creates webhook tables for developer event subscription system

CREATE TABLE "dev_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "secret" VARCHAR(255) NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_delivery_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "dev_webhooks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dev_webhooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "dev_webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "dev_webhook_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dev_webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "dev_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "dev_webhooks_tenant_id_is_active_idx" ON "dev_webhooks"("tenant_id", "is_active");
CREATE INDEX "dev_webhook_deliveries_webhook_id_success_idx" ON "dev_webhook_deliveries"("webhook_id", "success");
CREATE INDEX "dev_webhook_deliveries_event_type_delivered_at_idx" ON "dev_webhook_deliveries"("event_type", "delivered_at" DESC);
