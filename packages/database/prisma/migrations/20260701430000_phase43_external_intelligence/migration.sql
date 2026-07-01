-- Phase 43: AI External Intelligence Engine

CREATE TABLE "eie_sources" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID         NOT NULL,
  "name"      VARCHAR(255) NOT NULL,
  "type"      VARCHAR(50)  NOT NULL,
  "category"  VARCHAR(50)  NOT NULL,
  "url"       VARCHAR(1000),
  "enabled"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "config"    JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eie_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eie_sources_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "eie_sources_tenant_idx" ON "eie_sources"("tenant_id");
CREATE INDEX "eie_sources_type_idx" ON "eie_sources"("tenant_id","type");

CREATE TABLE "eie_signals" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "source_id"    UUID,
  "type"         VARCHAR(50)  NOT NULL,
  "title"        VARCHAR(500) NOT NULL,
  "summary"      TEXT,
  "value"        FLOAT,
  "unit"         VARCHAR(50),
  "sentiment"    VARCHAR(20),
  "relevance"    FLOAT,
  "tags"         TEXT[]       NOT NULL DEFAULT '{}',
  "external_url" VARCHAR(1000),
  "signal_date"  TIMESTAMPTZ  NOT NULL,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "eie_signals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eie_signals_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eie_signals_source_fk" FOREIGN KEY ("source_id")
    REFERENCES "eie_sources"("id") ON DELETE SET NULL
);
CREATE INDEX "eie_signals_tenant_idx"  ON "eie_signals"("tenant_id");
CREATE INDEX "eie_signals_type_idx"    ON "eie_signals"("tenant_id","type");
CREATE INDEX "eie_signals_date_idx"    ON "eie_signals"("tenant_id","signal_date");

CREATE TABLE "eie_alerts" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID        NOT NULL,
  "signal_id" UUID        NOT NULL,
  "severity"  VARCHAR(20) NOT NULL,
  "title"     VARCHAR(500) NOT NULL,
  "message"   TEXT        NOT NULL,
  "goal_ids"  TEXT[]      NOT NULL DEFAULT '{}',
  "dismissed" BOOLEAN     NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eie_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eie_alerts_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "eie_alerts_signal_fk" FOREIGN KEY ("signal_id")
    REFERENCES "eie_signals"("id") ON DELETE CASCADE
);
CREATE INDEX "eie_alerts_tenant_idx"    ON "eie_alerts"("tenant_id");
CREATE INDEX "eie_alerts_dismissed_idx" ON "eie_alerts"("tenant_id","dismissed");

CREATE TABLE "eie_insights" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "type"        VARCHAR(50) NOT NULL,
  "title"       VARCHAR(500) NOT NULL,
  "content"     TEXT        NOT NULL,
  "data"        JSONB,
  "goal_ids"    TEXT[]      NOT NULL DEFAULT '{}',
  "signal_ids"  TEXT[]      NOT NULL DEFAULT '{}',
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "eie_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eie_insights_tenant_fk" FOREIGN KEY ("tenant_id")
    REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "eie_insights_tenant_idx" ON "eie_insights"("tenant_id");
CREATE INDEX "eie_insights_type_idx"   ON "eie_insights"("tenant_id","type");
