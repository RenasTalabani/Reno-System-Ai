-- Phase 83: SIEM & Log Intelligence

CREATE TABLE "siem_log_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "source_type" VARCHAR(30) NOT NULL DEFAULT 'application',
  "format" VARCHAR(30) NOT NULL DEFAULT 'json',
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "events_per_day" INTEGER NOT NULL DEFAULT 0,
  "last_event_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "siem_log_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "siem_log_sources_tenant_id_idx" ON "siem_log_sources"("tenant_id");
ALTER TABLE "siem_log_sources" ADD CONSTRAINT "siem_log_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "siem_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "source_id" UUID NOT NULL,
  "event_type" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "actor" VARCHAR(100),
  "target_res" VARCHAR(255),
  "source_ip" VARCHAR(50),
  "raw" JSONB,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "siem_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "siem_events_tenant_id_source_id_event_type_idx" ON "siem_events"("tenant_id","source_id","event_type");
CREATE INDEX "siem_events_tenant_id_occurred_at_idx" ON "siem_events"("tenant_id","occurred_at");
ALTER TABLE "siem_events" ADD CONSTRAINT "siem_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "siem_events" ADD CONSTRAINT "siem_events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "siem_log_sources"("id") ON DELETE CASCADE;

CREATE TABLE "siem_correlation_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "event_type" VARCHAR(50) NOT NULL,
  "threshold" INTEGER NOT NULL DEFAULT 5,
  "window_minutes" INTEGER NOT NULL DEFAULT 10,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'high',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "siem_correlation_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "siem_correlation_rules_tenant_id_idx" ON "siem_correlation_rules"("tenant_id");
ALTER TABLE "siem_correlation_rules" ADD CONSTRAINT "siem_correlation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "siem_detections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "rule_id" UUID NOT NULL,
  "match_count" INTEGER NOT NULL DEFAULT 0,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'high',
  "status" VARCHAR(30) NOT NULL DEFAULT 'new',
  "summary" TEXT NOT NULL,
  "evidence" JSONB,
  "detected_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "siem_detections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "siem_detections_tenant_id_rule_id_idx" ON "siem_detections"("tenant_id","rule_id");
ALTER TABLE "siem_detections" ADD CONSTRAINT "siem_detections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "siem_detections" ADD CONSTRAINT "siem_detections_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "siem_correlation_rules"("id") ON DELETE CASCADE;

CREATE TABLE "siem_saved_queries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "query" JSONB NOT NULL,
  "created_by" VARCHAR(100),
  "run_count" INTEGER NOT NULL DEFAULT 0,
  "last_run_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "siem_saved_queries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "siem_saved_queries_tenant_id_idx" ON "siem_saved_queries"("tenant_id");
ALTER TABLE "siem_saved_queries" ADD CONSTRAINT "siem_saved_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "siem_retention_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "source_type" VARCHAR(30) NOT NULL DEFAULT 'all',
  "retention_days" INTEGER NOT NULL DEFAULT 90,
  "archive_enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "siem_retention_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "siem_retention_policies_tenant_id_idx" ON "siem_retention_policies"("tenant_id");
ALTER TABLE "siem_retention_policies" ADD CONSTRAINT "siem_retention_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;