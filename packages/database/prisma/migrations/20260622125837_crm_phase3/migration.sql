-- CreateTable
CREATE TABLE "crm_pipelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_pipeline_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "is_won" BOOLEAN NOT NULL DEFAULT false,
    "is_lost" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255),
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "website" VARCHAR(500),
    "linkedin_url" VARCHAR(500),
    "address" JSONB,
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "estimated_revenue" DECIMAL(15,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "employee_count" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'prospect',
    "health_score" INTEGER,
    "customer_lifetime_value" DECIMAL(15,2),
    "churn_risk" DECIMAL(3,2),
    "ai_insights" JSONB,
    "segment_tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "owner_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "job_title" VARCHAR(255),
    "department" VARCHAR(100),
    "linkedin_url" VARCHAR(500),
    "avatar_url" VARCHAR(500),
    "contact_type" VARCHAR(50) NOT NULL DEFAULT 'lead',
    "source" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'new',
    "lead_score" INTEGER,
    "churn_risk" DECIMAL(3,2),
    "customer_lifetime_value" DECIMAL(15,2),
    "ai_recommendations" JSONB,
    "ai_insights" JSONB,
    "segment_tags" JSONB NOT NULL DEFAULT '[]',
    "whatsapp_number" VARCHAR(50),
    "preferred_channel" VARCHAR(50),
    "timezone" VARCHAR(100),
    "language" VARCHAR(20),
    "do_not_contact" BOOLEAN NOT NULL DEFAULT false,
    "do_not_email" BOOLEAN NOT NULL DEFAULT false,
    "last_contacted_at" TIMESTAMP(3),
    "next_follow_up_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "address" JSONB,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "contact_id" UUID,
    "company_id" UUID,
    "owner_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "source" VARCHAR(100),
    "expected_close_date" DATE,
    "actual_close_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "lost_reason" TEXT,
    "description" TEXT,
    "ai_score" DECIMAL(3,2),
    "ai_insights" JSONB,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "company_id" UUID,
    "opportunity_id" UUID,
    "owner_id" UUID NOT NULL,
    "activity_type" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "outcome" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "direction" VARCHAR(20),
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "location" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "company_id" UUID,
    "opportunity_id" UUID,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "contact_id" UUID,
    "opportunity_id" UUID,
    "owner_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "contract_number" VARCHAR(100) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "start_date" DATE,
    "end_date" DATE,
    "signed_at" TIMESTAMP(3),
    "signed_by" VARCHAR(255),
    "document_url" VARCHAR(500),
    "terms" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "sender_id" UUID NOT NULL,
    "message_id" VARCHAR(500),
    "subject" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "contact_id" UUID,
    "company_id" UUID,
    "opportunity_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_mime_type" VARCHAR(100),
    "file_size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "entity_type" VARCHAR(50) NOT NULL DEFAULT 'all',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_pipelines_tenant_id_idx" ON "crm_pipelines"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_pipeline_stages_tenant_id_pipeline_id_idx" ON "crm_pipeline_stages"("tenant_id", "pipeline_id");

-- CreateIndex
CREATE INDEX "crm_companies_tenant_id_idx" ON "crm_companies"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_companies_tenant_id_owner_id_idx" ON "crm_companies"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "crm_companies_tenant_id_status_idx" ON "crm_companies"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "crm_companies_tenant_id_domain_idx" ON "crm_companies"("tenant_id", "domain");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_idx" ON "crm_contacts"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_owner_id_idx" ON "crm_contacts"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_company_id_idx" ON "crm_contacts"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_contact_type_idx" ON "crm_contacts"("tenant_id", "contact_type");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_status_idx" ON "crm_contacts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_email_idx" ON "crm_contacts"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_lead_score_idx" ON "crm_contacts"("tenant_id", "lead_score");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_idx" ON "crm_opportunities"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_pipeline_id_idx" ON "crm_opportunities"("tenant_id", "pipeline_id");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_stage_id_idx" ON "crm_opportunities"("tenant_id", "stage_id");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_owner_id_idx" ON "crm_opportunities"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_contact_id_idx" ON "crm_opportunities"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_company_id_idx" ON "crm_opportunities"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenant_id_status_idx" ON "crm_opportunities"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_idx" ON "crm_activities"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_contact_id_idx" ON "crm_activities"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_company_id_idx" ON "crm_activities"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_opportunity_id_idx" ON "crm_activities"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_owner_id_idx" ON "crm_activities"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_activity_type_idx" ON "crm_activities"("tenant_id", "activity_type");

-- CreateIndex
CREATE INDEX "crm_activities_tenant_id_status_idx" ON "crm_activities"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "crm_notes_tenant_id_contact_id_idx" ON "crm_notes"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "crm_notes_tenant_id_company_id_idx" ON "crm_notes"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "crm_notes_tenant_id_opportunity_id_idx" ON "crm_notes"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "crm_contracts_tenant_id_idx" ON "crm_contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_contracts_tenant_id_company_id_idx" ON "crm_contracts"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "crm_contracts_tenant_id_status_idx" ON "crm_contracts"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contracts_tenant_id_contract_number_key" ON "crm_contracts"("tenant_id", "contract_number");

-- CreateIndex
CREATE INDEX "crm_email_logs_tenant_id_contact_id_idx" ON "crm_email_logs"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "crm_email_logs_tenant_id_sender_id_idx" ON "crm_email_logs"("tenant_id", "sender_id");

-- CreateIndex
CREATE INDEX "crm_email_logs_tenant_id_status_idx" ON "crm_email_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "crm_attachments_tenant_id_entity_type_idx" ON "crm_attachments"("tenant_id", "entity_type");

-- CreateIndex
CREATE INDEX "crm_attachments_tenant_id_contact_id_idx" ON "crm_attachments"("tenant_id", "contact_id");

-- CreateIndex
CREATE INDEX "crm_attachments_tenant_id_company_id_idx" ON "crm_attachments"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "crm_attachments_tenant_id_opportunity_id_idx" ON "crm_attachments"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "crm_tags_tenant_id_idx" ON "crm_tags"("tenant_id");

-- CreateIndex
CREATE INDEX "crm_tags_tenant_id_entity_type_idx" ON "crm_tags"("tenant_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "crm_tags_tenant_id_name_key" ON "crm_tags"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "crm_pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contracts" ADD CONSTRAINT "crm_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contracts" ADD CONSTRAINT "crm_contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contracts" ADD CONSTRAINT "crm_contracts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_email_logs" ADD CONSTRAINT "crm_email_logs_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_attachments" ADD CONSTRAINT "crm_attachments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_attachments" ADD CONSTRAINT "crm_attachments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_attachments" ADD CONSTRAINT "crm_attachments_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
