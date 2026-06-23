-- CreateTable
CREATE TABLE "auto_workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "tags" TEXT[],
    "trigger_type" VARCHAR(50) NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 5000,
    "timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "brain_generated" BOOLEAN NOT NULL DEFAULT false,
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "success_runs" INTEGER NOT NULL DEFAULT 0,
    "failed_runs" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMP(3),
    "last_run_status" VARCHAR(50),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "auto_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "triggered_by" VARCHAR(255) NOT NULL,
    "trigger_type" VARCHAR(50) NOT NULL,
    "trigger_data" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "error_step" VARCHAR(255),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB,
    "output" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_execution_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "step_index" INTEGER NOT NULL,
    "step_id" VARCHAR(100) NOT NULL,
    "step_name" VARCHAR(255) NOT NULL,
    "step_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "input" JSONB,
    "output" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_approval_gates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "step_id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "decided_by" VARCHAR(255),
    "decision_note" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_approval_gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[],
    "icon" VARCHAR(100),
    "use_case" TEXT,
    "trigger_type" VARCHAR(50) NOT NULL,
    "definition" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "name" VARCHAR(255),
    "token" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_called_at" TIMESTAMP(3),
    "call_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_workflows_tenant_id_idx" ON "auto_workflows"("tenant_id");

-- CreateIndex
CREATE INDEX "auto_workflows_tenant_id_trigger_type_idx" ON "auto_workflows"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "auto_workflows_tenant_id_is_enabled_idx" ON "auto_workflows"("tenant_id", "is_enabled");

-- CreateIndex
CREATE INDEX "auto_workflows_next_run_at_idx" ON "auto_workflows"("next_run_at");

-- CreateIndex
CREATE UNIQUE INDEX "auto_workflows_tenant_id_slug_key" ON "auto_workflows"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "auto_executions_tenant_id_idx" ON "auto_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "auto_executions_workflow_id_idx" ON "auto_executions"("workflow_id");

-- CreateIndex
CREATE INDEX "auto_executions_tenant_id_status_idx" ON "auto_executions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "auto_executions_tenant_id_started_at_idx" ON "auto_executions"("tenant_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "auto_execution_steps_execution_id_idx" ON "auto_execution_steps"("execution_id");

-- CreateIndex
CREATE INDEX "auto_execution_steps_tenant_id_idx" ON "auto_execution_steps"("tenant_id");

-- CreateIndex
CREATE INDEX "auto_approval_gates_tenant_id_idx" ON "auto_approval_gates"("tenant_id");

-- CreateIndex
CREATE INDEX "auto_approval_gates_tenant_id_status_idx" ON "auto_approval_gates"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "auto_approval_gates_execution_id_idx" ON "auto_approval_gates"("execution_id");

-- CreateIndex
CREATE INDEX "auto_templates_tenant_id_idx" ON "auto_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "auto_templates_category_idx" ON "auto_templates"("category");

-- CreateIndex
CREATE INDEX "auto_templates_is_system_idx" ON "auto_templates"("is_system");

-- CreateIndex
CREATE UNIQUE INDEX "auto_webhooks_token_key" ON "auto_webhooks"("token");

-- CreateIndex
CREATE INDEX "auto_webhooks_tenant_id_idx" ON "auto_webhooks"("tenant_id");

-- CreateIndex
CREATE INDEX "auto_webhooks_workflow_id_idx" ON "auto_webhooks"("workflow_id");

-- AddForeignKey
ALTER TABLE "auto_workflows" ADD CONSTRAINT "auto_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_executions" ADD CONSTRAINT "auto_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_executions" ADD CONSTRAINT "auto_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "auto_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_execution_steps" ADD CONSTRAINT "auto_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "auto_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_approval_gates" ADD CONSTRAINT "auto_approval_gates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_approval_gates" ADD CONSTRAINT "auto_approval_gates_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "auto_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_approval_gates" ADD CONSTRAINT "auto_approval_gates_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "auto_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_webhooks" ADD CONSTRAINT "auto_webhooks_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "auto_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
