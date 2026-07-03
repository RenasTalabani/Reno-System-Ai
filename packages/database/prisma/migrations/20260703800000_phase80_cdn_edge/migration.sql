-- Phase 80: CDN & Edge Configuration

CREATE TABLE "cdn_zones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "domain" VARCHAR(255) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "ssl_mode" VARCHAR(30) NOT NULL DEFAULT 'full',
  "cache_level" VARCHAR(30) NOT NULL DEFAULT 'standard',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdn_zones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cdn_zones_tenant_id_domain_key" ON "cdn_zones"("tenant_id","domain");
CREATE INDEX "cdn_zones_tenant_id_idx" ON "cdn_zones"("tenant_id");
ALTER TABLE "cdn_zones" ADD CONSTRAINT "cdn_zones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cdn_origins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "zone_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "origin_url" VARCHAR(500) NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 100,
  "is_backup" BOOLEAN NOT NULL DEFAULT false,
  "status" VARCHAR(30) NOT NULL DEFAULT 'healthy',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdn_origins_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cdn_origins_tenant_id_zone_id_idx" ON "cdn_origins"("tenant_id","zone_id");
ALTER TABLE "cdn_origins" ADD CONSTRAINT "cdn_origins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdn_origins" ADD CONSTRAINT "cdn_origins_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "cdn_zones"("id") ON DELETE CASCADE;

CREATE TABLE "cdn_cache_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "zone_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "path_pattern" VARCHAR(255) NOT NULL,
  "ttl_seconds" INTEGER NOT NULL DEFAULT 3600,
  "cacheable" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdn_cache_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cdn_cache_rules_tenant_id_zone_id_idx" ON "cdn_cache_rules"("tenant_id","zone_id");
ALTER TABLE "cdn_cache_rules" ADD CONSTRAINT "cdn_cache_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdn_cache_rules" ADD CONSTRAINT "cdn_cache_rules_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "cdn_zones"("id") ON DELETE CASCADE;

CREATE TABLE "cdn_edge_locations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "country" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'online',
  "capacity_gbps" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "hit_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdn_edge_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cdn_edge_locations_tenant_id_code_key" ON "cdn_edge_locations"("tenant_id","code");
CREATE INDEX "cdn_edge_locations_tenant_id_idx" ON "cdn_edge_locations"("tenant_id");
ALTER TABLE "cdn_edge_locations" ADD CONSTRAINT "cdn_edge_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cdn_purge_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "zone_id" UUID NOT NULL,
  "purge_type" VARCHAR(30) NOT NULL DEFAULT 'url',
  "paths" JSONB NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
  "requested_by" VARCHAR(100),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdn_purge_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cdn_purge_requests_tenant_id_zone_id_idx" ON "cdn_purge_requests"("tenant_id","zone_id");
ALTER TABLE "cdn_purge_requests" ADD CONSTRAINT "cdn_purge_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdn_purge_requests" ADD CONSTRAINT "cdn_purge_requests_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "cdn_zones"("id") ON DELETE CASCADE;

CREATE TABLE "cdn_analytics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "zone_id" UUID NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  "bandwidth" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cache_hits" INTEGER NOT NULL DEFAULT 0,
  "cache_misses" INTEGER NOT NULL DEFAULT 0,
  "errors_4xx" INTEGER NOT NULL DEFAULT 0,
  "errors_5xx" INTEGER NOT NULL DEFAULT 0,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cdn_analytics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cdn_analytics_tenant_id_zone_id_idx" ON "cdn_analytics"("tenant_id","zone_id");
ALTER TABLE "cdn_analytics" ADD CONSTRAINT "cdn_analytics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cdn_analytics" ADD CONSTRAINT "cdn_analytics_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "cdn_zones"("id") ON DELETE CASCADE;