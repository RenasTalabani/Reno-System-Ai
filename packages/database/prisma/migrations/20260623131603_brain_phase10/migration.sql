-- CreateTable
CREATE TABLE "brain_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "system_prompt" TEXT,
    "persona" TEXT,
    "modules" JSONB,
    "capabilities" JSONB,
    "model" VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-6',
    "provider" VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    "max_tokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "icon_name" VARCHAR(50),
    "color" VARCHAR(30),
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_provider_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "api_key" VARCHAR(500),
    "base_url" VARCHAR(500),
    "model" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "title" VARCHAR(300),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "context_snapshot" JSONB,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "model" VARCHAR(100),
    "provider" VARCHAR(50),
    "latency_ms" INTEGER,
    "has_actions" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "conversation_id" UUID,
    "type" VARCHAR(30) NOT NULL,
    "scope" VARCHAR(20) NOT NULL DEFAULT 'session',
    "key" VARCHAR(200) NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DECIMAL(5,4),
    "source" VARCHAR(50),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_prompt_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "agent_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" JSONB,
    "category" VARCHAR(50),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID,
    "type" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'low',
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "executed_at" TIMESTAMP(3),
    "result" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "conversation_id" UUID,
    "agent_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50),
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "description" TEXT,
    "ip_address" VARCHAR(45),
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "agent_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_suggest" BOOLEAN NOT NULL DEFAULT true,
    "can_act" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brain_agents_tenant_id_idx" ON "brain_agents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "brain_agents_tenant_id_slug_key" ON "brain_agents"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "brain_provider_configs_tenant_id_idx" ON "brain_provider_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "brain_conversations_tenant_id_user_id_idx" ON "brain_conversations"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "brain_messages_tenant_id_conversation_id_idx" ON "brain_messages"("tenant_id", "conversation_id");

-- CreateIndex
CREATE INDEX "brain_memories_tenant_id_user_id_idx" ON "brain_memories"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "brain_memories_tenant_id_scope_key_idx" ON "brain_memories"("tenant_id", "scope", "key");

-- CreateIndex
CREATE INDEX "brain_prompt_templates_tenant_id_idx" ON "brain_prompt_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "brain_prompt_templates_tenant_id_slug_key" ON "brain_prompt_templates"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "brain_actions_tenant_id_status_idx" ON "brain_actions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "brain_audit_logs_tenant_id_occurred_at_idx" ON "brain_audit_logs"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "brain_audit_logs_tenant_id_agent_id_idx" ON "brain_audit_logs"("tenant_id", "agent_id");

-- CreateIndex
CREATE INDEX "brain_permissions_agent_id_idx" ON "brain_permissions"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "brain_permissions_agent_id_module_key" ON "brain_permissions"("agent_id", "module");

-- AddForeignKey
ALTER TABLE "brain_provider_configs" ADD CONSTRAINT "brain_provider_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_conversations" ADD CONSTRAINT "brain_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_conversations" ADD CONSTRAINT "brain_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "brain_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_messages" ADD CONSTRAINT "brain_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "brain_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_memories" ADD CONSTRAINT "brain_memories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_memories" ADD CONSTRAINT "brain_memories_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "brain_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_prompt_templates" ADD CONSTRAINT "brain_prompt_templates_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "brain_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_actions" ADD CONSTRAINT "brain_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_actions" ADD CONSTRAINT "brain_actions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "brain_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_actions" ADD CONSTRAINT "brain_actions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "brain_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_audit_logs" ADD CONSTRAINT "brain_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_permissions" ADD CONSTRAINT "brain_permissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "brain_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
