-- Phase 99: Platform Health Monitor
CREATE TABLE IF NOT EXISTS "phlt_checks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "service" VARCHAR(100) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "response_ms" INTEGER,
  "message" VARCHAR(500),
  "checked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "phlt_checks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "phlt_checks_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "phlt_checks_tenant_id_idx" ON "phlt_checks"("tenant_id");
CREATE INDEX IF NOT EXISTS "phlt_checks_tenant_service_idx" ON "phlt_checks"("tenant_id", "service");

CREATE TABLE IF NOT EXISTS "phlt_slos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "service" VARCHAR(100) NOT NULL,
  "metric" VARCHAR(50) NOT NULL,
  "target" DECIMAL(7,4) NOT NULL,
  "window" VARCHAR(10) NOT NULL DEFAULT '30d',
  "current" DECIMAL(7,4),
  "status" VARCHAR(20) NOT NULL DEFAULT 'meeting',
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "phlt_slos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "phlt_slos_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "phlt_slos_tenant_id_idx" ON "phlt_slos"("tenant_id");

CREATE TABLE IF NOT EXISTS "phlt_incidents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "slo_id" UUID,
  "title" VARCHAR(300) NOT NULL,
  "severity" VARCHAR(10) NOT NULL DEFAULT 'p3',
  "service" VARCHAR(100) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open',
  "detected_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolved_at" TIMESTAMPTZ,
  "summary" TEXT,
  CONSTRAINT "phlt_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "phlt_incidents_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "phlt_incidents_slo_fkey" FOREIGN KEY ("slo_id") REFERENCES "phlt_slos"("id")
);
CREATE INDEX IF NOT EXISTS "phlt_incidents_tenant_id_idx" ON "phlt_incidents"("tenant_id");