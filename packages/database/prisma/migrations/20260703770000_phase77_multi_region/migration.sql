-- Phase 77: Multi-Region Configuration

CREATE TABLE "mr_regions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "provider" VARCHAR(50) NOT NULL DEFAULT 'aws',
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "latency_ms" INTEGER,
  "capacity" INTEGER NOT NULL DEFAULT 100,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mr_regions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mr_regions_tenant_id_code_key" ON "mr_regions"("tenant_id","code");
CREATE INDEX "mr_regions_tenant_id_idx" ON "mr_regions"("tenant_id");
ALTER TABLE "mr_regions" ADD CONSTRAINT "mr_regions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mr_endpoints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "region_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "url" VARCHAR(500) NOT NULL,
  "endpoint_type" VARCHAR(30) NOT NULL DEFAULT 'api',
  "status" VARCHAR(30) NOT NULL DEFAULT 'healthy',
  "weight" INTEGER NOT NULL DEFAULT 100,
  "latency_ms" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mr_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mr_endpoints_tenant_id_region_id_idx" ON "mr_endpoints"("tenant_id","region_id");
ALTER TABLE "mr_endpoints" ADD CONSTRAINT "mr_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mr_endpoints" ADD CONSTRAINT "mr_endpoints_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "mr_regions"("id") ON DELETE CASCADE;

CREATE TABLE "mr_routing_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "policy_type" VARCHAR(30) NOT NULL DEFAULT 'latency',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "rules" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mr_routing_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mr_routing_policies_tenant_id_idx" ON "mr_routing_policies"("tenant_id");
ALTER TABLE "mr_routing_policies" ADD CONSTRAINT "mr_routing_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "mr_health_checks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "region_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'healthy',
  "latency_ms" INTEGER,
  "checked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "details" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mr_health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mr_health_checks_tenant_id_region_id_idx" ON "mr_health_checks"("tenant_id","region_id");
ALTER TABLE "mr_health_checks" ADD CONSTRAINT "mr_health_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mr_health_checks" ADD CONSTRAINT "mr_health_checks_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "mr_regions"("id") ON DELETE CASCADE;

CREATE TABLE "mr_failover_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "region_id" UUID NOT NULL,
  "from_region" VARCHAR(50),
  "to_region" VARCHAR(50),
  "reason" VARCHAR(255),
  "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
  "triggered_by" VARCHAR(50),
  "duration_ms" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mr_failover_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mr_failover_events_tenant_id_idx" ON "mr_failover_events"("tenant_id");
ALTER TABLE "mr_failover_events" ADD CONSTRAINT "mr_failover_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mr_failover_events" ADD CONSTRAINT "mr_failover_events_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "mr_regions"("id") ON DELETE CASCADE;

CREATE TABLE "mr_replication_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "region_id" UUID NOT NULL,
  "source_region" VARCHAR(50) NOT NULL,
  "target_region" VARCHAR(50) NOT NULL,
  "replication_type" VARCHAR(30) NOT NULL DEFAULT 'async',
  "lag_ms" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "mr_replication_configs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mr_replication_configs_tenant_id_region_id_idx" ON "mr_replication_configs"("tenant_id","region_id");
ALTER TABLE "mr_replication_configs" ADD CONSTRAINT "mr_replication_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mr_replication_configs" ADD CONSTRAINT "mr_replication_configs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "mr_regions"("id") ON DELETE CASCADE;