-- Phase 26: Production Deployment & CI/CD
-- Creates dep_deployment_logs table for immutable deployment audit trail

CREATE TABLE "dep_deployment_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" VARCHAR(50) NOT NULL,
    "environment" VARCHAR(30) NOT NULL,
    "deployed_by" VARCHAR(100),
    "strategy" VARCHAR(30) NOT NULL DEFAULT 'rolling',
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "previous_version" VARCHAR(50),
    "commit_sha" VARCHAR(64),
    "branch" VARCHAR(255),
    "migration_ran" BOOLEAN NOT NULL DEFAULT false,
    "health_check_passed" BOOLEAN NOT NULL DEFAULT false,
    "tests_passed" BOOLEAN NOT NULL DEFAULT false,
    "rollback_reason" TEXT,
    "duration_ms" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "dep_deployment_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dep_deployment_logs_environment_status_idx" ON "dep_deployment_logs"("environment", "status");
CREATE INDEX "dep_deployment_logs_version_idx" ON "dep_deployment_logs"("version");
CREATE INDEX "dep_deployment_logs_started_at_idx" ON "dep_deployment_logs"("started_at" DESC);
