-- Phase 60: Event Sourcing & Audit Trail

CREATE TABLE "evs_events" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "stream"        VARCHAR(200) NOT NULL,
  "type"          VARCHAR(200) NOT NULL,
  "aggregate_id"  VARCHAR(200) NOT NULL,
  "aggregate_type" VARCHAR(100) NOT NULL,
  "version"       INTEGER     NOT NULL DEFAULT 1,
  "payload"       JSONB       NOT NULL DEFAULT '{}',
  "metadata"      JSONB       NOT NULL DEFAULT '{}',
  "actor_id"      UUID,
  "actor_type"    VARCHAR(50) NOT NULL DEFAULT 'user',
  "occurred_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "evs_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "evs_events_stream_idx" ON "evs_events"("tenant_id","stream","occurred_at");
CREATE INDEX "evs_events_aggregate_idx" ON "evs_events"("tenant_id","aggregate_id","version");
CREATE INDEX "evs_events_type_idx" ON "evs_events"("tenant_id","type","occurred_at");
ALTER TABLE "evs_events" ADD CONSTRAINT "evs_events_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "evs_snapshots" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "aggregate_id"  VARCHAR(200) NOT NULL,
  "aggregate_type" VARCHAR(100) NOT NULL,
  "version"       INTEGER     NOT NULL,
  "state"         JSONB       NOT NULL DEFAULT '{}',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "evs_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "evs_snapshots_aggregate_version_idx" ON "evs_snapshots"("tenant_id","aggregate_id","version");
ALTER TABLE "evs_snapshots" ADD CONSTRAINT "evs_snapshots_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "evs_projections" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "stream"      VARCHAR(200),
  "last_event"  UUID,
  "checkpoint"  TIMESTAMPTZ,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'active',
  "error"       TEXT,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "evs_projections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "evs_projections_tenant_name_idx" ON "evs_projections"("tenant_id","name");
ALTER TABLE "evs_projections" ADD CONSTRAINT "evs_projections_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
