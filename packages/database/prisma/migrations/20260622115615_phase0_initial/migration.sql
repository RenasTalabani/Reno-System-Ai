-- CreateTable
CREATE TABLE "core_tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'starter',
    "status" VARCHAR(50) NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "registration_no" VARCHAR(100),
    "tax_id" VARCHAR(100),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "date_format" VARCHAR(50) NOT NULL DEFAULT 'YYYY-MM-DD',
    "fiscal_year_start" INTEGER NOT NULL DEFAULT 1,
    "address" JSONB,
    "contact" JSONB,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "branch_type" VARCHAR(50),
    "address" JSONB,
    "contact" JSONB,
    "manager_id" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" TEXT,
    "head_id" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "department_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "lead_id" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone" VARCHAR(50),
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "mfa_backup_codes" TEXT,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(50),
    "password_changed_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "locale" VARCHAR(20) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(200),
    "avatar_url" VARCHAR(500),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "nationality" VARCHAR(100),
    "bio" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_user_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "department_id" UUID,
    "team_id" UUID,
    "job_title" VARCHAR(200),
    "employee_id" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_user_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(20),
    "scope" VARCHAR(50) NOT NULL DEFAULT 'company',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "scope" VARCHAR(50) NOT NULL DEFAULT 'all',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_user_permission_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "granted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(255),
    "device_type" VARCHAR(50),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "request_id" UUID,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "channel" VARCHAR(50) NOT NULL DEFAULT 'in_app',
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "module" VARCHAR(100) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "data_type" VARCHAR(50) NOT NULL DEFAULT 'string',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_branding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "logo_url" VARCHAR(500),
    "logo_dark_url" VARCHAR(500),
    "favicon_url" VARCHAR(500),
    "app_name" VARCHAR(255),
    "primary_color" VARCHAR(20) DEFAULT '#6366f1',
    "secondary_color" VARCHAR(20) DEFAULT '#8b5cf6',
    "accent_color" VARCHAR(20) DEFAULT '#ec4899',
    "font_family" VARCHAR(100) DEFAULT 'Inter',
    "theme" VARCHAR(50) DEFAULT 'light',
    "custom_css" TEXT,
    "custom_domain" VARCHAR(255),
    "login_bg" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "queue" VARCHAR(100) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error" TEXT,
    "result" JSONB,
    "triggered_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_feature_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "feature" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_pct" INTEGER NOT NULL DEFAULT 100,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(20) NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "locale" VARCHAR(20) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sys_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_tenants_slug_key" ON "core_tenants"("slug");

-- CreateIndex
CREATE INDEX "core_companies_tenant_id_idx" ON "core_companies"("tenant_id");

-- CreateIndex
CREATE INDEX "core_companies_tenant_id_deleted_at_idx" ON "core_companies"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "core_branches_tenant_id_idx" ON "core_branches"("tenant_id");

-- CreateIndex
CREATE INDEX "core_branches_tenant_id_company_id_idx" ON "core_branches"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "core_departments_tenant_id_idx" ON "core_departments"("tenant_id");

-- CreateIndex
CREATE INDEX "core_departments_tenant_id_company_id_idx" ON "core_departments"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "core_departments_parent_id_idx" ON "core_departments"("parent_id");

-- CreateIndex
CREATE INDEX "core_teams_tenant_id_idx" ON "core_teams"("tenant_id");

-- CreateIndex
CREATE INDEX "core_teams_tenant_id_department_id_idx" ON "core_teams"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "core_users_tenant_id_idx" ON "core_users"("tenant_id");

-- CreateIndex
CREATE INDEX "core_users_tenant_id_status_idx" ON "core_users"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "core_users_tenant_id_email_key" ON "core_users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "core_user_profiles_user_id_key" ON "core_user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "core_user_profiles_tenant_id_idx" ON "core_user_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "core_user_memberships_tenant_id_user_id_idx" ON "core_user_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "core_user_memberships_tenant_id_company_id_idx" ON "core_user_memberships"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "core_roles_tenant_id_idx" ON "core_roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "core_roles_tenant_id_slug_key" ON "core_roles"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "core_permissions_module_resource_action_scope_key" ON "core_permissions"("module", "resource", "action", "scope");

-- CreateIndex
CREATE INDEX "core_role_permissions_tenant_id_role_id_idx" ON "core_role_permissions"("tenant_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "core_role_permissions_tenant_id_role_id_permission_id_key" ON "core_role_permissions"("tenant_id", "role_id", "permission_id");

-- CreateIndex
CREATE INDEX "core_user_roles_tenant_id_user_id_idx" ON "core_user_roles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "core_user_roles_tenant_id_role_id_idx" ON "core_user_roles"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "core_user_permission_overrides_tenant_id_user_id_idx" ON "core_user_permission_overrides"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "core_sessions_tenant_id_user_id_idx" ON "core_sessions"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "core_sessions_refresh_token_hash_idx" ON "core_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sys_audit_logs_tenant_id_entity_type_entity_id_idx" ON "sys_audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "sys_audit_logs_tenant_id_user_id_idx" ON "sys_audit_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "sys_audit_logs_tenant_id_occurred_at_idx" ON "sys_audit_logs"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "sys_audit_logs_tenant_id_module_idx" ON "sys_audit_logs"("tenant_id", "module");

-- CreateIndex
CREATE INDEX "sys_notifications_tenant_id_user_id_idx" ON "sys_notifications"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "sys_notifications_tenant_id_user_id_read_at_idx" ON "sys_notifications"("tenant_id", "user_id", "read_at");

-- CreateIndex
CREATE INDEX "sys_settings_tenant_id_module_idx" ON "sys_settings"("tenant_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "sys_settings_tenant_id_company_id_module_key_key" ON "sys_settings"("tenant_id", "company_id", "module", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sys_branding_tenant_id_key" ON "sys_branding"("tenant_id");

-- CreateIndex
CREATE INDEX "sys_jobs_tenant_id_status_idx" ON "sys_jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_jobs_tenant_id_queue_status_idx" ON "sys_jobs"("tenant_id", "queue", "status");

-- CreateIndex
CREATE INDEX "sys_feature_flags_tenant_id_idx" ON "sys_feature_flags"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_feature_flags_tenant_id_module_feature_key" ON "sys_feature_flags"("tenant_id", "module", "feature");

-- CreateIndex
CREATE UNIQUE INDEX "sys_api_keys_key_hash_key" ON "sys_api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "sys_api_keys_tenant_id_idx" ON "sys_api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "sys_translations_tenant_id_entity_type_entity_id_idx" ON "sys_translations"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "sys_translations_tenant_id_locale_idx" ON "sys_translations"("tenant_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "sys_translations_tenant_id_entity_type_entity_id_field_loca_key" ON "sys_translations"("tenant_id", "entity_type", "entity_id", "field", "locale");

-- AddForeignKey
ALTER TABLE "core_companies" ADD CONSTRAINT "core_companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_branches" ADD CONSTRAINT "core_branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "core_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "core_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_teams" ADD CONSTRAINT "core_teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_users" ADD CONSTRAINT "core_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_profiles" ADD CONSTRAINT "core_user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_memberships" ADD CONSTRAINT "core_user_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_memberships" ADD CONSTRAINT "core_user_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_memberships" ADD CONSTRAINT "core_user_memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "core_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_memberships" ADD CONSTRAINT "core_user_memberships_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_memberships" ADD CONSTRAINT "core_user_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "core_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_roles" ADD CONSTRAINT "core_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_role_permissions" ADD CONSTRAINT "core_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "core_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_role_permissions" ADD CONSTRAINT "core_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "core_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_roles" ADD CONSTRAINT "core_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_roles" ADD CONSTRAINT "core_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "core_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_permission_overrides" ADD CONSTRAINT "core_user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_permission_overrides" ADD CONSTRAINT "core_user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "core_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_sessions" ADD CONSTRAINT "core_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_audit_logs" ADD CONSTRAINT "sys_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_notifications" ADD CONSTRAINT "sys_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_notifications" ADD CONSTRAINT "sys_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_settings" ADD CONSTRAINT "sys_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_branding" ADD CONSTRAINT "sys_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_jobs" ADD CONSTRAINT "sys_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_feature_flags" ADD CONSTRAINT "sys_feature_flags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_api_keys" ADD CONSTRAINT "sys_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
