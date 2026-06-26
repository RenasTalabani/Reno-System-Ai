-- CreateTable
CREATE TABLE "bkp_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "job_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "target_type" VARCHAR(50) NOT NULL DEFAULT 'postgres',
    "size_bytes" BIGINT,
    "compressed_bytes" BIGINT,
    "storage_location" VARCHAR(500),
    "encryption_key_id" VARCHAR(100),
    "integrity_hash" VARCHAR(128),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "immutable_until" TIMESTAMP(3),
    "rpo_target_mins" INTEGER NOT NULL DEFAULT 60,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bkp_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bkp_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "job_id" UUID NOT NULL,
    "snapshot_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(255),
    "pitr_timestamp" TIMESTAMP(3),
    "base_snapshot_id" UUID,
    "wal_start_lsn" VARCHAR(50),
    "wal_end_lsn" VARCHAR(50),
    "integrity_hash" VARCHAR(128),
    "size_bytes" BIGINT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bkp_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bkp_restore_tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "test_type" VARCHAR(50) NOT NULL DEFAULT 'integrity',
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "rto_actual_mins" INTEGER,
    "rto_target_mins" INTEGER NOT NULL DEFAULT 60,
    "records_verified" INTEGER,
    "checksum_passed" BOOLEAN NOT NULL DEFAULT false,
    "tested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "bkp_restore_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bkp_replications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "target_region" VARCHAR(100) NOT NULL,
    "target_location" VARCHAR(500) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bkp_replications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bkp_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "job_type" VARCHAR(50) NOT NULL,
    "cron_expression" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rpo_target_mins" INTEGER NOT NULL DEFAULT 60,
    "rto_target_mins" INTEGER NOT NULL DEFAULT 240,
    "retention_days" INTEGER NOT NULL DEFAULT 30,
    "enable_replication" BOOLEAN NOT NULL DEFAULT false,
    "replication_regions" JSONB NOT NULL DEFAULT '[]',
    "encryption_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bkp_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dr_playbooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(30) NOT NULL DEFAULT 'critical',
    "steps" JSONB NOT NULL,
    "rto_target_mins" INTEGER NOT NULL DEFAULT 240,
    "rpo_target_mins" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dr_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dr_playbook_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "playbook_id" UUID NOT NULL,
    "triggered_by" UUID,
    "trigger_reason" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL DEFAULT 'running',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "step_results" JSONB NOT NULL DEFAULT '[]',
    "rto_actual_mins" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "dr_playbook_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dr_readiness_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "score" INTEGER NOT NULL,
    "rto_score" INTEGER NOT NULL,
    "rpo_score" INTEGER NOT NULL,
    "backup_score" INTEGER NOT NULL,
    "replication_score" INTEGER NOT NULL,
    "testing_score" INTEGER NOT NULL,
    "playbook_score" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dr_readiness_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sre_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "severity" VARCHAR(30) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "root_cause" TEXT,
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "affected_services" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "capacity_forecast" JSONB,
    "digital_twin_state" JSONB,
    "ai_analysis" TEXT,
    "human_approval_required" BOOLEAN NOT NULL DEFAULT true,
    "auto_actions_blocked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_sre_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bkp_jobs_tenant_id_job_type_status_idx" ON "bkp_jobs"("tenant_id", "job_type", "status");

-- CreateIndex
CREATE INDEX "bkp_jobs_created_at_idx" ON "bkp_jobs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "bkp_jobs_status_created_at_idx" ON "bkp_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "bkp_snapshots_tenant_id_snapshot_type_idx" ON "bkp_snapshots"("tenant_id", "snapshot_type");

-- CreateIndex
CREATE INDEX "bkp_snapshots_pitr_timestamp_idx" ON "bkp_snapshots"("pitr_timestamp");

-- CreateIndex
CREATE INDEX "bkp_snapshots_job_id_idx" ON "bkp_snapshots"("job_id");

-- CreateIndex
CREATE INDEX "bkp_restore_tests_job_id_idx" ON "bkp_restore_tests"("job_id");

-- CreateIndex
CREATE INDEX "bkp_restore_tests_status_tested_at_idx" ON "bkp_restore_tests"("status", "tested_at");

-- CreateIndex
CREATE INDEX "bkp_replications_job_id_idx" ON "bkp_replications"("job_id");

-- CreateIndex
CREATE INDEX "bkp_replications_target_region_status_idx" ON "bkp_replications"("target_region", "status");

-- CreateIndex
CREATE INDEX "bkp_schedules_tenant_id_is_active_idx" ON "bkp_schedules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "bkp_schedules_next_run_at_idx" ON "bkp_schedules"("next_run_at");

-- CreateIndex
CREATE INDEX "dr_playbooks_category_is_active_idx" ON "dr_playbooks"("category", "is_active");

-- CreateIndex
CREATE INDEX "dr_playbook_executions_playbook_id_status_idx" ON "dr_playbook_executions"("playbook_id", "status");

-- CreateIndex
CREATE INDEX "dr_playbook_executions_started_at_idx" ON "dr_playbook_executions"("started_at" DESC);

-- CreateIndex
CREATE INDEX "dr_readiness_scores_scored_at_idx" ON "dr_readiness_scores"("scored_at" DESC);

-- CreateIndex
CREATE INDEX "ai_sre_incidents_tenant_id_status_idx" ON "ai_sre_incidents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ai_sre_incidents_severity_detected_at_idx" ON "ai_sre_incidents"("severity", "detected_at");

-- AddForeignKey
ALTER TABLE "bkp_jobs" ADD CONSTRAINT "bkp_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkp_snapshots" ADD CONSTRAINT "bkp_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkp_snapshots" ADD CONSTRAINT "bkp_snapshots_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "bkp_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkp_snapshots" ADD CONSTRAINT "bkp_snapshots_base_snapshot_id_fkey" FOREIGN KEY ("base_snapshot_id") REFERENCES "bkp_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkp_restore_tests" ADD CONSTRAINT "bkp_restore_tests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "bkp_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkp_replications" ADD CONSTRAINT "bkp_replications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "bkp_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bkp_schedules" ADD CONSTRAINT "bkp_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dr_playbook_executions" ADD CONSTRAINT "dr_playbook_executions_playbook_id_fkey" FOREIGN KEY ("playbook_id") REFERENCES "dr_playbooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sre_incidents" ADD CONSTRAINT "ai_sre_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
