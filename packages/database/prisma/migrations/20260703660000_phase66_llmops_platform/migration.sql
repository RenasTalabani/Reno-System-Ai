CREATE TABLE "llm_providers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "provider_type" TEXT NOT NULL DEFAULT 'custom',
  "base_url" TEXT,
  "default_model" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'unknown',
  "last_check" TIMESTAMPTZ,
  "last_error" TEXT,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avg_latency_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "llm_providers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "llm_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "llm_providers_tenant_id_idx" ON "llm_providers"("tenant_id");

CREATE TABLE "llm_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "module" TEXT NOT NULL DEFAULT 'unknown',
  "task_type" TEXT NOT NULL DEFAULT 'generate',
  "model" TEXT,
  "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "latency_ms" INTEGER NOT NULL DEFAULT 0,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error_code" TEXT,
  "fallback_from" TEXT,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "llm_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "llm_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "llm_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "llm_providers"("id") ON DELETE CASCADE
);
CREATE INDEX "llm_requests_tenant_id_idx" ON "llm_requests"("tenant_id");
CREATE INDEX "llm_requests_tenant_requested_at_idx" ON "llm_requests"("tenant_id", "requested_at");

CREATE TABLE "llm_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "module" TEXT NOT NULL,
  "allowed_providers" JSONB NOT NULL DEFAULT '[]',
  "preferred_provider" TEXT,
  "fallback_order" JSONB NOT NULL DEFAULT '[]',
  "max_cost_per_request" DOUBLE PRECISION,
  "requires_approval" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "llm_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "llm_policies_tenant_module_key" UNIQUE ("tenant_id", "module"),
  CONSTRAINT "llm_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "llm_policies_tenant_id_idx" ON "llm_policies"("tenant_id");

CREATE TABLE "llm_prompt_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "prompt_key" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID NOT NULL,
  "changelog" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "llm_prompt_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "llm_prompt_versions_tenant_key_version_key" UNIQUE ("tenant_id", "prompt_key", "version"),
  CONSTRAINT "llm_prompt_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "llm_prompt_versions_tenant_id_idx" ON "llm_prompt_versions"("tenant_id");

CREATE TABLE "llm_experiments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "task_type" TEXT NOT NULL,
  "sample_prompt" TEXT NOT NULL,
  "sample_count" INTEGER NOT NULL DEFAULT 10,
  "providers" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "recommendation" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "llm_experiments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "llm_experiments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "llm_experiments_tenant_id_idx" ON "llm_experiments"("tenant_id");

CREATE TABLE "llm_experiment_results" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "avg_latency_ms" DOUBLE PRECISION NOT NULL,
  "avg_cost_usd" DOUBLE PRECISION NOT NULL,
  "success_rate" DOUBLE PRECISION NOT NULL,
  "accuracy_score" DOUBLE PRECISION,
  "total_runs" INTEGER NOT NULL,
  "rank" INTEGER NOT NULL DEFAULT 1,
  "ai_recommendation" TEXT,
  CONSTRAINT "llm_experiment_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "llm_experiment_results_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "llm_experiments"("id") ON DELETE CASCADE
);
CREATE INDEX "llm_experiment_results_experiment_id_idx" ON "llm_experiment_results"("experiment_id");