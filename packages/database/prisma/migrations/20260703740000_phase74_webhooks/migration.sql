-- Phase 74: Enterprise Webhooks & Event Bus
-- Models: WbhEndpoint, WbhSubscription, WbhEvent, WbhDelivery, WbhSecret, WbhLog

CREATE TABLE "wbh_endpoints" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID          NOT NULL,
  "created_by"    UUID          NOT NULL,
  "name"          VARCHAR(255)  NOT NULL,
  "description"   TEXT,
  "url"           VARCHAR(1000) NOT NULL,
  "is_active"     BOOLEAN       NOT NULL DEFAULT TRUE,
  "retry_enabled" BOOLEAN       NOT NULL DEFAULT TRUE,
  "max_retries"   INTEGER       NOT NULL DEFAULT 3,
  "timeout_ms"    INTEGER       NOT NULL DEFAULT 10000,
  "success_count" INTEGER       NOT NULL DEFAULT 0,
  "failure_count" INTEGER       NOT NULL DEFAULT 0,
  "last_called_at" TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wbh_endpoints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wbh_endpoints_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "wbh_endpoints_tenant_idx" ON "wbh_endpoints" ("tenant_id");

CREATE TABLE "wbh_subscriptions" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "endpoint_id" UUID         NOT NULL,
  "event_type"  VARCHAR(100) NOT NULL,
  "filters"     JSONB        NOT NULL DEFAULT '{}',
  "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wbh_subscriptions_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "wbh_subscriptions_unique" UNIQUE ("endpoint_id", "event_type"),
  CONSTRAINT "wbh_subscriptions_tenant_fk"   FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")   ON DELETE CASCADE,
  CONSTRAINT "wbh_subscriptions_endpoint_fk" FOREIGN KEY ("endpoint_id") REFERENCES "wbh_endpoints"("id") ON DELETE CASCADE
);
CREATE INDEX "wbh_subscriptions_tenant_idx"      ON "wbh_subscriptions" ("tenant_id");
CREATE INDEX "wbh_subscriptions_tenant_event_idx" ON "wbh_subscriptions" ("tenant_id", "event_type");

CREATE TABLE "wbh_events" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "source"     VARCHAR(100) NOT NULL,
  "payload"    JSONB        NOT NULL DEFAULT '{}',
  "metadata"   JSONB        NOT NULL DEFAULT '{}',
  "status"     VARCHAR(20)  NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wbh_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wbh_events_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "wbh_events_tenant_idx"       ON "wbh_events" ("tenant_id");
CREATE INDEX "wbh_events_tenant_type_idx"  ON "wbh_events" ("tenant_id", "event_type");
CREATE INDEX "wbh_events_tenant_status_idx" ON "wbh_events" ("tenant_id", "status");

CREATE TABLE "wbh_deliveries" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "event_id"      UUID        NOT NULL,
  "endpoint_id"   UUID        NOT NULL,
  "status"        VARCHAR(20) NOT NULL DEFAULT 'pending',
  "http_status"   INTEGER,
  "response_body" TEXT,
  "error_message" TEXT,
  "duration_ms"   INTEGER,
  "attempt_count" INTEGER     NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMPTZ,
  "delivered_at"  TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wbh_deliveries_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "wbh_deliveries_tenant_fk"  FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")   ON DELETE CASCADE,
  CONSTRAINT "wbh_deliveries_event_fk"   FOREIGN KEY ("event_id")    REFERENCES "wbh_events"("id")     ON DELETE CASCADE,
  CONSTRAINT "wbh_deliveries_endpoint_fk" FOREIGN KEY ("endpoint_id") REFERENCES "wbh_endpoints"("id") ON DELETE CASCADE
);
CREATE INDEX "wbh_deliveries_tenant_idx"       ON "wbh_deliveries" ("tenant_id");
CREATE INDEX "wbh_deliveries_event_idx"        ON "wbh_deliveries" ("event_id");
CREATE INDEX "wbh_deliveries_tenant_status_idx" ON "wbh_deliveries" ("tenant_id", "status");

CREATE TABLE "wbh_secrets" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "endpoint_id" UUID        NOT NULL,
  "secret_hash" VARCHAR(128) NOT NULL,
  "algorithm"   VARCHAR(20) NOT NULL DEFAULT 'sha256',
  "is_active"   BOOLEAN     NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"  TIMESTAMPTZ,
  CONSTRAINT "wbh_secrets_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "wbh_secrets_tenant_fk"  FOREIGN KEY ("tenant_id")   REFERENCES "core_tenants"("id")   ON DELETE CASCADE,
  CONSTRAINT "wbh_secrets_endpoint_fk" FOREIGN KEY ("endpoint_id") REFERENCES "wbh_endpoints"("id") ON DELETE CASCADE
);
CREATE INDEX "wbh_secrets_tenant_idx" ON "wbh_secrets" ("tenant_id");

CREATE TABLE "wbh_logs" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "action"      VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(50)  NOT NULL,
  "entity_id"   UUID,
  "details"     JSONB        NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wbh_logs_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "wbh_logs_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "wbh_logs_tenant_idx" ON "wbh_logs" ("tenant_id");