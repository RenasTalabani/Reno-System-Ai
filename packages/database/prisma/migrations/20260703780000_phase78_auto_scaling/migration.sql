-- Phase 78: Auto Scaling Engine

CREATE TABLE "as_targets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "target_type" VARCHAR(30) NOT NULL DEFAULT 'deployment',
  "resource_ref" VARCHAR(255) NOT NULL,
  "min_replicas" INTEGER NOT NULL DEFAULT 1,
  "max_replicas" INTEGER NOT NULL DEFAULT 10,
  "current_replicas" INTEGER NOT NULL DEFAULT 1,
  "desired_replicas" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "as_targets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "as_targets_tenant_id_idx" ON "as_targets"("tenant_id");
ALTER TABLE "as_targets" ADD CONSTRAINT "as_targets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "as_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "metric_type" VARCHAR(30) NOT NULL DEFAULT 'cpu',
  "threshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
  "comparison" VARCHAR(10) NOT NULL DEFAULT 'gt',
  "scale_direction" VARCHAR(10) NOT NULL DEFAULT 'up',
  "step_size" INTEGER NOT NULL DEFAULT 1,
  "cooldown_sec" INTEGER NOT NULL DEFAULT 300,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_triggered_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "as_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "as_policies_tenant_id_target_id_idx" ON "as_policies"("tenant_id","target_id");
ALTER TABLE "as_policies" ADD CONSTRAINT "as_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "as_policies" ADD CONSTRAINT "as_policies_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "as_targets"("id") ON DELETE CASCADE;

CREATE TABLE "as_metric_samples" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "metric_type" VARCHAR(30) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "as_metric_samples_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "as_metric_samples_tenant_id_target_id_metric_type_idx" ON "as_metric_samples"("tenant_id","target_id","metric_type");
ALTER TABLE "as_metric_samples" ADD CONSTRAINT "as_metric_samples_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "as_metric_samples" ADD CONSTRAINT "as_metric_samples_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "as_targets"("id") ON DELETE CASCADE;

CREATE TABLE "as_scaling_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "policy_id" UUID,
  "event_type" VARCHAR(30) NOT NULL DEFAULT 'scale-up',
  "from_replicas" INTEGER NOT NULL,
  "to_replicas" INTEGER NOT NULL,
  "reason" VARCHAR(255),
  "triggered_by" VARCHAR(30) NOT NULL DEFAULT 'policy',
  "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "as_scaling_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "as_scaling_events_tenant_id_target_id_idx" ON "as_scaling_events"("tenant_id","target_id");
ALTER TABLE "as_scaling_events" ADD CONSTRAINT "as_scaling_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "as_scaling_events" ADD CONSTRAINT "as_scaling_events_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "as_targets"("id") ON DELETE CASCADE;

CREATE TABLE "as_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "cron_expr" VARCHAR(100) NOT NULL,
  "target_replicas" INTEGER NOT NULL,
  "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_run_at" TIMESTAMPTZ,
  "next_run_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "as_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "as_schedules_tenant_id_target_id_idx" ON "as_schedules"("tenant_id","target_id");
ALTER TABLE "as_schedules" ADD CONSTRAINT "as_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "as_schedules" ADD CONSTRAINT "as_schedules_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "as_targets"("id") ON DELETE CASCADE;

CREATE TABLE "as_recommendations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "recommendation_type" VARCHAR(30) NOT NULL DEFAULT 'rightsize',
  "current_value" INTEGER NOT NULL,
  "recommended_value" INTEGER NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "rationale" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "as_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "as_recommendations_tenant_id_target_id_idx" ON "as_recommendations"("tenant_id","target_id");
ALTER TABLE "as_recommendations" ADD CONSTRAINT "as_recommendations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "as_recommendations" ADD CONSTRAINT "as_recommendations_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "as_targets"("id") ON DELETE CASCADE;