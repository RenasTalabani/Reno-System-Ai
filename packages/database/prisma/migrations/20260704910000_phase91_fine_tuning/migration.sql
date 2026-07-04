-- Phase 91: Fine-Tuning Studio

CREATE TABLE "ft_datasets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "task_type" VARCHAR(30) NOT NULL DEFAULT 'chat',
  "sample_count" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "samples" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ft_datasets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ft_datasets_tenant_id_idx" ON "ft_datasets"("tenant_id");
ALTER TABLE "ft_datasets" ADD CONSTRAINT "ft_datasets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "ft_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dataset_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "base_model" VARCHAR(100) NOT NULL DEFAULT 'reno-brain-base',
  "provider" VARCHAR(30) NOT NULL DEFAULT 'reno-brain',
  "status" VARCHAR(30) NOT NULL DEFAULT 'queued',
  "epochs" INTEGER NOT NULL DEFAULT 3,
  "learning_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0001,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "train_loss" DOUBLE PRECISION,
  "metrics" JSONB,
  "started_at" TIMESTAMPTZ,
  "finished_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ft_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ft_jobs_tenant_id_dataset_id_idx" ON "ft_jobs"("tenant_id","dataset_id");
ALTER TABLE "ft_jobs" ADD CONSTRAINT "ft_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ft_jobs" ADD CONSTRAINT "ft_jobs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "ft_datasets"("id") ON DELETE CASCADE;

CREATE TABLE "ft_models" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "job_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "version" VARCHAR(20) NOT NULL DEFAULT '1',
  "provider" VARCHAR(30) NOT NULL DEFAULT 'reno-brain',
  "status" VARCHAR(30) NOT NULL DEFAULT 'ready',
  "size_mb" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ft_models_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ft_models_tenant_id_job_id_idx" ON "ft_models"("tenant_id","job_id");
ALTER TABLE "ft_models" ADD CONSTRAINT "ft_models_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ft_models" ADD CONSTRAINT "ft_models_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "ft_jobs"("id") ON DELETE CASCADE;

CREATE TABLE "ft_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_id" UUID NOT NULL,
  "eval_type" VARCHAR(30) NOT NULL DEFAULT 'accuracy',
  "score" DOUBLE PRECISION NOT NULL,
  "baseline_score" DOUBLE PRECISION,
  "details" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ft_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ft_evaluations_tenant_id_model_id_idx" ON "ft_evaluations"("tenant_id","model_id");
ALTER TABLE "ft_evaluations" ADD CONSTRAINT "ft_evaluations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ft_evaluations" ADD CONSTRAINT "ft_evaluations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ft_models"("id") ON DELETE CASCADE;

CREATE TABLE "ft_deployments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_id" UUID NOT NULL,
  "environment" VARCHAR(30) NOT NULL DEFAULT 'staging',
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending-approval',
  "approved_by" VARCHAR(100),
  "traffic_pct" INTEGER NOT NULL DEFAULT 0,
  "deployed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ft_deployments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ft_deployments_tenant_id_model_id_idx" ON "ft_deployments"("tenant_id","model_id");
ALTER TABLE "ft_deployments" ADD CONSTRAINT "ft_deployments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ft_deployments" ADD CONSTRAINT "ft_deployments_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ft_models"("id") ON DELETE CASCADE;

CREATE TABLE "ft_feedbacks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model_ref" VARCHAR(100) NOT NULL,
  "prompt" TEXT NOT NULL,
  "completion" TEXT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 0,
  "correction" TEXT,
  "added_to_dataset" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ft_feedbacks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ft_feedbacks_tenant_id_model_ref_idx" ON "ft_feedbacks"("tenant_id","model_ref");
ALTER TABLE "ft_feedbacks" ADD CONSTRAINT "ft_feedbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;