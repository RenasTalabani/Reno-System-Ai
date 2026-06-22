-- AlterTable
ALTER TABLE "core_tenants" ADD COLUMN     "ai_monthly_token_quota" INTEGER;

-- AlterTable
ALTER TABLE "sys_translations" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "source" VARCHAR(50) NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "sys_ui_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "namespace" VARCHAR(255) NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "locale" VARCHAR(20) NOT NULL,
    "value" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'system',
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_ui_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "module" VARCHAR(100) NOT NULL,
    "feature" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    "model" VARCHAR(100) NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(12,8) NOT NULL DEFAULT 0,
    "request_duration_ms" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'success',
    "error_code" VARCHAR(100),
    "request_id" UUID,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sys_ui_translations_locale_idx" ON "sys_ui_translations"("locale");

-- CreateIndex
CREATE INDEX "sys_ui_translations_namespace_locale_idx" ON "sys_ui_translations"("namespace", "locale");

-- CreateIndex
CREATE INDEX "sys_ui_translations_tenant_id_is_approved_idx" ON "sys_ui_translations"("tenant_id", "is_approved");

-- CreateIndex
CREATE UNIQUE INDEX "sys_ui_translations_tenant_id_namespace_key_locale_key" ON "sys_ui_translations"("tenant_id", "namespace", "key", "locale");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenant_id_occurred_at_idx" ON "ai_usage_logs"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenant_id_user_id_idx" ON "ai_usage_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenant_id_module_feature_idx" ON "ai_usage_logs"("tenant_id", "module", "feature");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenant_id_model_idx" ON "ai_usage_logs"("tenant_id", "model");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenant_id_status_idx" ON "ai_usage_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_translations_tenant_id_is_approved_idx" ON "sys_translations"("tenant_id", "is_approved");

-- CreateIndex
CREATE INDEX "sys_translations_source_idx" ON "sys_translations"("source");

-- AddForeignKey
ALTER TABLE "sys_translations" ADD CONSTRAINT "sys_translations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_ui_translations" ADD CONSTRAINT "sys_ui_translations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
