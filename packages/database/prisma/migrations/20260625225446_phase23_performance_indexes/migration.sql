-- CreateIndex
CREATE INDEX "core_sessions_tenant_id_user_id_revoked_at_expires_at_idx" ON "core_sessions"("tenant_id", "user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "core_sessions_is_active_expires_at_idx" ON "core_sessions"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "core_users_tenant_id_deleted_at_idx" ON "core_users"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "core_users_tenant_id_locked_until_idx" ON "core_users"("tenant_id", "locked_until");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_deleted_at_idx" ON "crm_contacts"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "crm_contacts_tenant_id_deleted_at_created_at_idx" ON "crm_contacts"("tenant_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_deleted_at_idx" ON "hr_employees"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_deleted_at_created_at_idx" ON "hr_employees"("tenant_id", "deleted_at", "created_at");
