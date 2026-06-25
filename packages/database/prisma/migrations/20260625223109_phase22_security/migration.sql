-- AlterTable
ALTER TABLE "core_users" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "core_tenant_security_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "password_min_length" INTEGER NOT NULL DEFAULT 12,
    "password_require_upper" BOOLEAN NOT NULL DEFAULT true,
    "password_require_lower" BOOLEAN NOT NULL DEFAULT true,
    "password_require_number" BOOLEAN NOT NULL DEFAULT true,
    "password_require_symbol" BOOLEAN NOT NULL DEFAULT true,
    "password_expiry_days" INTEGER NOT NULL DEFAULT 0,
    "password_history_count" INTEGER NOT NULL DEFAULT 5,
    "max_failed_attempts" INTEGER NOT NULL DEFAULT 5,
    "lockout_duration_mins" INTEGER NOT NULL DEFAULT 15,
    "session_timeout_mins" INTEGER NOT NULL DEFAULT 480,
    "max_concurrent_sessions" INTEGER NOT NULL DEFAULT 10,
    "mfa_required" BOOLEAN NOT NULL DEFAULT false,
    "mfa_required_for_admins" BOOLEAN NOT NULL DEFAULT false,
    "ip_allowlist_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "core_tenant_security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_password_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sec_login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "fail_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sec_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sec_security_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sec_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sec_ip_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "cidr" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100),
    "reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sec_ip_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_tenant_security_policies_tenant_id_key" ON "core_tenant_security_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "core_password_history_tenant_id_user_id_idx" ON "core_password_history"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "core_password_history_user_id_created_at_idx" ON "core_password_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sec_login_attempts_email_created_at_idx" ON "sec_login_attempts"("email", "created_at");

-- CreateIndex
CREATE INDEX "sec_login_attempts_ip_address_created_at_idx" ON "sec_login_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "sec_login_attempts_tenant_id_created_at_idx" ON "sec_login_attempts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "sec_login_attempts_user_id_created_at_idx" ON "sec_login_attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sec_security_events_tenant_id_created_at_idx" ON "sec_security_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "sec_security_events_tenant_id_severity_idx" ON "sec_security_events"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "sec_security_events_tenant_id_event_type_idx" ON "sec_security_events"("tenant_id", "event_type");

-- CreateIndex
CREATE INDEX "sec_security_events_tenant_id_resolved_idx" ON "sec_security_events"("tenant_id", "resolved");

-- CreateIndex
CREATE INDEX "sec_ip_rules_tenant_id_type_is_active_idx" ON "sec_ip_rules"("tenant_id", "type", "is_active");

-- AddForeignKey
ALTER TABLE "core_tenant_security_policies" ADD CONSTRAINT "core_tenant_security_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_password_history" ADD CONSTRAINT "core_password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sec_login_attempts" ADD CONSTRAINT "sec_login_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sec_security_events" ADD CONSTRAINT "sec_security_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sec_ip_rules" ADD CONSTRAINT "sec_ip_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
