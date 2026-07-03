-- Phase 67: High Availability & Resilience Platform
-- Migration: 20260703670000_phase67_ha_resilience

CREATE TABLE "hrsp_circuit_breakers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "service_name" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'closed',
  "failure_count" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "failure_threshold" INTEGER NOT NULL DEFAULT 5,
  "last_failure_at" TIMESTAMPTZ,
  "last_failure_reason" TEXT,
  "recovery_timeout_sec" INTEGER NOT NULL DEFAULT 60,
  "next_retry_at" TIMESTAMPTZ,
  "opened_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_circuit_breakers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_health_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "component" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unknown',
  "latency_ms" INTEGER,
  "error_rate" DOUBLE PRECISION,
  "details" JSONB NOT NULL DEFAULT '{}',
  "resilience_score" DOUBLE PRECISION,
  "checked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_health_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_component_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "snapshot_id" UUID,
  "component" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMPTZ,
  "resolved_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_component_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_failover_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plan_name" TEXT NOT NULL,
  "target_service" TEXT NOT NULL,
  "strategy" TEXT NOT NULL DEFAULT 'manual',
  "primary_target" TEXT NOT NULL,
  "secondary_target" TEXT,
  "steps" JSONB NOT NULL DEFAULT '[]',
  "estimated_rto_sec" INTEGER NOT NULL DEFAULT 300,
  "estimated_rpo_sec" INTEGER NOT NULL DEFAULT 60,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_simulated_at" TIMESTAMPTZ,
  "last_score" DOUBLE PRECISION,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_failover_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_dr_scenarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "scenario_type" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'high',
  "estimated_rto_sec" INTEGER NOT NULL DEFAULT 3600,
  "estimated_rpo_sec" INTEGER NOT NULL DEFAULT 900,
  "recovery_steps" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_dr_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_dr_simulations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "scenario_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "actual_rto_sec" INTEGER,
  "actual_rpo_sec" INTEGER,
  "rto_met" BOOLEAN,
  "rpo_met" BOOLEAN,
  "resilience_score" DOUBLE PRECISION,
  "findings" JSONB NOT NULL DEFAULT '[]',
  "recommendations" JSONB NOT NULL DEFAULT '[]',
  "report" JSONB NOT NULL DEFAULT '{}',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_dr_simulations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_cache_strategies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "strategy_key" TEXT NOT NULL,
  "cache_layer" TEXT NOT NULL DEFAULT 'redis',
  "ttl_seconds" INTEGER NOT NULL DEFAULT 300,
  "invalidation_policy" TEXT NOT NULL DEFAULT 'ttl',
  "fallback_mode" TEXT NOT NULL DEFAULT 'database',
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "hit_count" INTEGER NOT NULL DEFAULT 0,
  "miss_count" INTEGER NOT NULL DEFAULT 0,
  "degraded_mode_hits" INTEGER NOT NULL DEFAULT 0,
  "cache_health" TEXT NOT NULL DEFAULT 'unknown',
  "last_health_check" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_cache_strategies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_deployment_simulations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "strategy" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "target_environment" TEXT NOT NULL DEFAULT 'production',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "readiness_score" DOUBLE PRECISION,
  "health_gates" JSONB NOT NULL DEFAULT '[]',
  "rollback_recommended" BOOLEAN NOT NULL DEFAULT false,
  "rollback_reason" TEXT,
  "simulation_steps" JSONB NOT NULL DEFAULT '[]',
  "findings" JSONB NOT NULL DEFAULT '[]',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_deployment_simulations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_chaos_experiments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "experiment_type" TEXT NOT NULL,
  "target_component" TEXT NOT NULL,
  "intensity" TEXT NOT NULL DEFAULT 'low',
  "duration_seconds" INTEGER NOT NULL DEFAULT 30,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "is_safe_mode" BOOLEAN NOT NULL DEFAULT true,
  "system_response" JSONB NOT NULL DEFAULT '{}',
  "recommendations" JSONB NOT NULL DEFAULT '[]',
  "resilience_score" DOUBLE PRECISION,
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_chaos_experiments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hrsp_resilience_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "report_type" TEXT NOT NULL DEFAULT 'on_demand',
  "overall_score" DOUBLE PRECISION NOT NULL,
  "components" JSONB NOT NULL DEFAULT '{}',
  "findings" JSONB NOT NULL DEFAULT '[]',
  "recommendations" JSONB NOT NULL DEFAULT '[]',
  "executive_summary" TEXT,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hrsp_resilience_reports_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "hrsp_circuit_breakers" ADD CONSTRAINT "hrsp_circuit_breakers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_health_snapshots" ADD CONSTRAINT "hrsp_health_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_component_alerts" ADD CONSTRAINT "hrsp_component_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_component_alerts" ADD CONSTRAINT "hrsp_component_alerts_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "hrsp_health_snapshots"("id") ON DELETE SET NULL;
ALTER TABLE "hrsp_failover_plans" ADD CONSTRAINT "hrsp_failover_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_dr_scenarios" ADD CONSTRAINT "hrsp_dr_scenarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_dr_simulations" ADD CONSTRAINT "hrsp_dr_simulations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_dr_simulations" ADD CONSTRAINT "hrsp_dr_simulations_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "hrsp_dr_scenarios"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_cache_strategies" ADD CONSTRAINT "hrsp_cache_strategies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_deployment_simulations" ADD CONSTRAINT "hrsp_deployment_simulations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_chaos_experiments" ADD CONSTRAINT "hrsp_chaos_experiments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hrsp_resilience_reports" ADD CONSTRAINT "hrsp_resilience_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX "hrsp_circuit_breakers_tenant_service_unique" ON "hrsp_circuit_breakers"("tenant_id", "service_name");
CREATE UNIQUE INDEX "hrsp_cache_strategies_tenant_key_unique" ON "hrsp_cache_strategies"("tenant_id", "strategy_key");

-- Indexes
CREATE INDEX "hrsp_circuit_breakers_tenant_id_idx" ON "hrsp_circuit_breakers"("tenant_id");
CREATE INDEX "hrsp_health_snapshots_tenant_id_idx" ON "hrsp_health_snapshots"("tenant_id");
CREATE INDEX "hrsp_health_snapshots_tenant_checked_idx" ON "hrsp_health_snapshots"("tenant_id", "checked_at");
CREATE INDEX "hrsp_component_alerts_tenant_id_idx" ON "hrsp_component_alerts"("tenant_id");
CREATE INDEX "hrsp_failover_plans_tenant_id_idx" ON "hrsp_failover_plans"("tenant_id");
CREATE INDEX "hrsp_dr_scenarios_tenant_id_idx" ON "hrsp_dr_scenarios"("tenant_id");
CREATE INDEX "hrsp_dr_simulations_tenant_id_idx" ON "hrsp_dr_simulations"("tenant_id");
CREATE INDEX "hrsp_cache_strategies_tenant_id_idx" ON "hrsp_cache_strategies"("tenant_id");
CREATE INDEX "hrsp_deployment_simulations_tenant_id_idx" ON "hrsp_deployment_simulations"("tenant_id");
CREATE INDEX "hrsp_chaos_experiments_tenant_id_idx" ON "hrsp_chaos_experiments"("tenant_id");
CREATE INDEX "hrsp_resilience_reports_tenant_id_idx" ON "hrsp_resilience_reports"("tenant_id");