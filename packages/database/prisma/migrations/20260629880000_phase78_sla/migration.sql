-- Phase 78: SLA Management
CREATE TABLE "sla_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "module" VARCHAR(50) NOT NULL,
  "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "response_hours" INTEGER NOT NULL,
  "resolution_hours" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sla_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_definitions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sla_definitions_tenant_id_idx" ON "sla_definitions"("tenant_id");

CREATE TABLE "sla_breaches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "sla_id" UUID NOT NULL,
  "ref_id" UUID NOT NULL,
  "ref_type" VARCHAR(50) NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "due_at" TIMESTAMPTZ NOT NULL,
  "breached_at" TIMESTAMPTZ,
  "resolved_at" TIMESTAMPTZ,
  "minutes_late" INTEGER,
  CONSTRAINT "sla_breaches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_breaches_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "sla_breaches_sla_fkey" FOREIGN KEY ("sla_id") REFERENCES "sla_definitions"("id")
);
CREATE INDEX "sla_breaches_tenant_id_idx" ON "sla_breaches"("tenant_id");
CREATE INDEX "sla_breaches_tenant_sla_idx" ON "sla_breaches"("tenant_id", "sla_id");
