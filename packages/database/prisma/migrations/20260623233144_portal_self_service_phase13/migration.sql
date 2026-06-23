-- CreateTable
CREATE TABLE "portal_branding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "portal_name" VARCHAR(255) NOT NULL DEFAULT 'Company Portal',
    "logo_url" VARCHAR(500),
    "favicon_url" VARCHAR(500),
    "primary_color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "secondary_color" VARCHAR(20) NOT NULL DEFAULT '#8b5cf6',
    "accent_color" VARCHAR(20) NOT NULL DEFAULT '#10b981',
    "welcome_message" TEXT,
    "footer_text" TEXT,
    "custom_domain" VARCHAR(255),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "employee_portal_enabled" BOOLEAN NOT NULL DEFAULT true,
    "customer_portal_enabled" BOOLEAN NOT NULL DEFAULT true,
    "supplier_portal_enabled" BOOLEAN NOT NULL DEFAULT true,
    "partner_portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "portal_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "portal_type" VARCHAR(50) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_download" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "portal_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "portal_type" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(30) NOT NULL,
    "submitted_by" UUID NOT NULL,
    "portal_type" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'normal',
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "portal_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_ticket_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_branding_tenant_id_key" ON "portal_branding"("tenant_id");

-- CreateIndex
CREATE INDEX "portal_users_tenant_id_idx" ON "portal_users"("tenant_id");

-- CreateIndex
CREATE INDEX "portal_users_tenant_id_portal_type_idx" ON "portal_users"("tenant_id", "portal_type");

-- CreateIndex
CREATE INDEX "portal_users_entity_id_idx" ON "portal_users"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_users_tenant_id_user_id_key" ON "portal_users"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "portal_permissions_tenant_id_portal_type_idx" ON "portal_permissions"("tenant_id", "portal_type");

-- CreateIndex
CREATE INDEX "portal_notifications_tenant_id_user_id_idx" ON "portal_notifications"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "portal_notifications_tenant_id_user_id_is_read_idx" ON "portal_notifications"("tenant_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "portal_audit_logs_tenant_id_occurred_at_idx" ON "portal_audit_logs"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "portal_audit_logs_tenant_id_portal_type_idx" ON "portal_audit_logs"("tenant_id", "portal_type");

-- CreateIndex
CREATE INDEX "portal_audit_logs_tenant_id_user_id_idx" ON "portal_audit_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "portal_tickets_tenant_id_idx" ON "portal_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "portal_tickets_tenant_id_portal_type_idx" ON "portal_tickets"("tenant_id", "portal_type");

-- CreateIndex
CREATE INDEX "portal_tickets_submitted_by_idx" ON "portal_tickets"("submitted_by");

-- CreateIndex
CREATE UNIQUE INDEX "portal_tickets_tenant_id_number_key" ON "portal_tickets"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "portal_ticket_replies_ticket_id_idx" ON "portal_ticket_replies"("ticket_id");

-- CreateIndex
CREATE INDEX "portal_ticket_replies_tenant_id_idx" ON "portal_ticket_replies"("tenant_id");

-- AddForeignKey
ALTER TABLE "portal_branding" ADD CONSTRAINT "portal_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_audit_logs" ADD CONSTRAINT "portal_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_tickets" ADD CONSTRAINT "portal_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_ticket_replies" ADD CONSTRAINT "portal_ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "portal_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
