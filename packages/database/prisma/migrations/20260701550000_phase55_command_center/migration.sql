-- Phase 55: AI Platform Command Center

CREATE TABLE "pcc_alerts" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL,
  "module"        TEXT NOT NULL,
  "alert_type"    TEXT NOT NULL,
  "severity"      TEXT NOT NULL DEFAULT 'info',
  "title"         TEXT NOT NULL,
  "message"       TEXT NOT NULL,
  "metadata"      JSONB NOT NULL DEFAULT '{}',
  "is_read"       BOOLEAN NOT NULL DEFAULT FALSE,
  "is_resolved"   BOOLEAN NOT NULL DEFAULT FALSE,
  "resolved_at"   TIMESTAMPTZ,
  "resolved_by"   UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pcc_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pcc_alerts_tenant_id_idx" ON "pcc_alerts"("tenant_id");
ALTER TABLE "pcc_alerts" ADD CONSTRAINT "pcc_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "pcc_metric_snapshots" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "period"       TEXT NOT NULL DEFAULT 'hourly',
  "captured_at"  TIMESTAMPTZ NOT NULL,
  "metrics"      JSONB NOT NULL DEFAULT '{}',
  "ai_score"     FLOAT NOT NULL DEFAULT 0,
  "trend"        TEXT NOT NULL DEFAULT 'stable',
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pcc_metric_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pcc_metric_snapshots_tenant_period_at_key" ON "pcc_metric_snapshots"("tenant_id","period","captured_at");
CREATE INDEX "pcc_metric_snapshots_tenant_id_idx" ON "pcc_metric_snapshots"("tenant_id");
ALTER TABLE "pcc_metric_snapshots" ADD CONSTRAINT "pcc_metric_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "pcc_health_checks" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "module"       TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'healthy',
  "response_ms"  INTEGER NOT NULL DEFAULT 0,
  "details"      JSONB NOT NULL DEFAULT '{}',
  "checked_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pcc_health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pcc_health_checks_tenant_id_idx" ON "pcc_health_checks"("tenant_id");
ALTER TABLE "pcc_health_checks" ADD CONSTRAINT "pcc_health_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;