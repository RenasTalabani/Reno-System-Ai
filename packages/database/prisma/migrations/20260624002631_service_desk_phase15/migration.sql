-- CreateTable
CREATE TABLE "sd_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sd_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_sla_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(50) NOT NULL,
    "first_response_minutes" INTEGER NOT NULL,
    "resolution_minutes" INTEGER NOT NULL,
    "business_hours_only" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sd_sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_escalation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sla_policy_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "trigger_type" VARCHAR(50) NOT NULL,
    "trigger_minutes" INTEGER NOT NULL,
    "priority" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_user_id" UUID,
    "notify_emails" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sd_escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(255),
    "specializations" JSONB NOT NULL DEFAULT '[]',
    "max_tickets" INTEGER NOT NULL DEFAULT 20,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sd_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(30) NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'internal',
    "source_ref" VARCHAR(255),
    "portal_ticket_id" UUID,
    "subject" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" UUID,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "type" VARCHAR(50) NOT NULL DEFAULT 'question',
    "requester_id" UUID NOT NULL,
    "requester_type" VARCHAR(50) NOT NULL DEFAULT 'user',
    "agent_id" UUID,
    "sla_policy_id" UUID,
    "first_response_at" TIMESTAMP(3),
    "first_response_due" TIMESTAMP(3),
    "resolution_due" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "ai_category" VARCHAR(255),
    "ai_priority" VARCHAR(50),
    "ai_sentiment" VARCHAR(50),
    "ai_summary" TEXT,
    "ai_response_suggestion" TEXT,
    "ai_confidence" DECIMAL(5,4),
    "ai_classified_at" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sd_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_ticket_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "is_ai_suggested" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sd_ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_ticket_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "comment_id" UUID,
    "file_name" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(200) NOT NULL,
    "storage_url" VARCHAR(1000) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sd_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sd_csat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submitted_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sd_csat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sd_categories_tenant_id_idx" ON "sd_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "sd_categories_tenant_id_parent_id_idx" ON "sd_categories"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "sd_sla_policies_tenant_id_idx" ON "sd_sla_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "sd_escalation_rules_tenant_id_idx" ON "sd_escalation_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "sd_agents_tenant_id_idx" ON "sd_agents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_agents_tenant_id_user_id_key" ON "sd_agents"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "sd_tickets_tenant_id_idx" ON "sd_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "sd_tickets_tenant_id_status_idx" ON "sd_tickets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sd_tickets_tenant_id_agent_id_idx" ON "sd_tickets"("tenant_id", "agent_id");

-- CreateIndex
CREATE INDEX "sd_tickets_tenant_id_requester_id_idx" ON "sd_tickets"("tenant_id", "requester_id");

-- CreateIndex
CREATE INDEX "sd_tickets_tenant_id_priority_idx" ON "sd_tickets"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "sd_tickets_tenant_id_category_id_idx" ON "sd_tickets"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_tickets_tenant_id_number_key" ON "sd_tickets"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "sd_ticket_comments_ticket_id_idx" ON "sd_ticket_comments"("ticket_id");

-- CreateIndex
CREATE INDEX "sd_ticket_comments_tenant_id_idx" ON "sd_ticket_comments"("tenant_id");

-- CreateIndex
CREATE INDEX "sd_ticket_attachments_ticket_id_idx" ON "sd_ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "sd_ticket_attachments_tenant_id_idx" ON "sd_ticket_attachments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sd_csat_ticket_id_key" ON "sd_csat"("ticket_id");

-- CreateIndex
CREATE INDEX "sd_csat_tenant_id_idx" ON "sd_csat"("tenant_id");

-- AddForeignKey
ALTER TABLE "sd_categories" ADD CONSTRAINT "sd_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_categories" ADD CONSTRAINT "sd_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sd_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_sla_policies" ADD CONSTRAINT "sd_sla_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_escalation_rules" ADD CONSTRAINT "sd_escalation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_escalation_rules" ADD CONSTRAINT "sd_escalation_rules_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sd_sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_agents" ADD CONSTRAINT "sd_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_tickets" ADD CONSTRAINT "sd_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_tickets" ADD CONSTRAINT "sd_tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "sd_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_tickets" ADD CONSTRAINT "sd_tickets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "sd_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_tickets" ADD CONSTRAINT "sd_tickets_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sd_sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_ticket_comments" ADD CONSTRAINT "sd_ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "sd_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_ticket_attachments" ADD CONSTRAINT "sd_ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "sd_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_ticket_attachments" ADD CONSTRAINT "sd_ticket_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "sd_ticket_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_csat" ADD CONSTRAINT "sd_csat_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sd_csat" ADD CONSTRAINT "sd_csat_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "sd_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
