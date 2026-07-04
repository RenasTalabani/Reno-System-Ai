-- Phase 96: Licensing Engine

CREATE TABLE "lic_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "tier" VARCHAR(30) NOT NULL DEFAULT 'starter',
  "price_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "price_yearly" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "max_users" INTEGER NOT NULL DEFAULT 10,
  "features" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lic_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lic_plans_tenant_id_code_key" ON "lic_plans"("tenant_id","code");
CREATE INDEX "lic_plans_tenant_id_idx" ON "lic_plans"("tenant_id");
ALTER TABLE "lic_plans" ADD CONSTRAINT "lic_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "lic_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "key_hash" VARCHAR(128) NOT NULL,
  "key_prefix" VARCHAR(20) NOT NULL,
  "customer_ref" VARCHAR(150) NOT NULL,
  "seats" INTEGER NOT NULL DEFAULT 10,
  "status" VARCHAR(30) NOT NULL DEFAULT 'issued',
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lic_keys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lic_keys_tenant_id_key_prefix_idx" ON "lic_keys"("tenant_id","key_prefix");
ALTER TABLE "lic_keys" ADD CONSTRAINT "lic_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "lic_keys" ADD CONSTRAINT "lic_keys_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "lic_plans"("id") ON DELETE CASCADE;

CREATE TABLE "lic_activations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "key_id" UUID NOT NULL,
  "machine_ref" VARCHAR(150) NOT NULL,
  "hostname" VARCHAR(150),
  "app_version" VARCHAR(30),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "activated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deactivated_at" TIMESTAMPTZ,
  "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lic_activations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lic_activations_key_id_machine_ref_key" ON "lic_activations"("key_id","machine_ref");
CREATE INDEX "lic_activations_tenant_id_key_id_idx" ON "lic_activations"("tenant_id","key_id");
ALTER TABLE "lic_activations" ADD CONSTRAINT "lic_activations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "lic_activations" ADD CONSTRAINT "lic_activations_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "lic_keys"("id") ON DELETE CASCADE;

CREATE TABLE "lic_entitlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_ref" VARCHAR(150) NOT NULL,
  "feature" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "limit_value" INTEGER,
  "source" VARCHAR(30) NOT NULL DEFAULT 'plan',
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lic_entitlements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lic_entitlements_tenant_id_customer_ref_feature_key" ON "lic_entitlements"("tenant_id","customer_ref","feature");
CREATE INDEX "lic_entitlements_tenant_id_customer_ref_idx" ON "lic_entitlements"("tenant_id","customer_ref");
ALTER TABLE "lic_entitlements" ADD CONSTRAINT "lic_entitlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "lic_meters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_ref" VARCHAR(150) NOT NULL,
  "meter_type" VARCHAR(50) NOT NULL,
  "used_value" INTEGER NOT NULL DEFAULT 0,
  "period_start" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "period_end" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lic_meters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lic_meters_tenant_id_customer_ref_meter_type_key" ON "lic_meters"("tenant_id","customer_ref","meter_type");
CREATE INDEX "lic_meters_tenant_id_customer_ref_idx" ON "lic_meters"("tenant_id","customer_ref");
ALTER TABLE "lic_meters" ADD CONSTRAINT "lic_meters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "lic_renewals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "key_id" UUID NOT NULL,
  "previous_expiry" TIMESTAMPTZ,
  "new_expiry" TIMESTAMPTZ NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lic_renewals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lic_renewals_tenant_id_key_id_idx" ON "lic_renewals"("tenant_id","key_id");
ALTER TABLE "lic_renewals" ADD CONSTRAINT "lic_renewals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "lic_renewals" ADD CONSTRAINT "lic_renewals_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "lic_keys"("id") ON DELETE CASCADE;