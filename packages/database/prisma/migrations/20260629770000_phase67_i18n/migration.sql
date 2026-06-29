-- Phase 67: Multi-language / i18n Engine
CREATE TABLE "i18n_locales" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "code" VARCHAR(10) NOT NULL,
  "name" VARCHAR(100) NOT NULL, "native_name" VARCHAR(100) NOT NULL, "is_rtl" BOOLEAN NOT NULL DEFAULT false,
  "is_default" BOOLEAN NOT NULL DEFAULT false, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "i18n_locales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "i18n_locales_tenant_code_key" UNIQUE ("tenant_id","code")
);
CREATE INDEX "i18n_locales_tenant_id_idx" ON "i18n_locales"("tenant_id");

CREATE TABLE "i18n_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL,
  "namespace" VARCHAR(100) NOT NULL, "key" VARCHAR(500) NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "i18n_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "i18n_keys_tenant_ns_key_unique" UNIQUE ("tenant_id","namespace","key")
);
CREATE INDEX "i18n_keys_tenant_ns_idx" ON "i18n_keys"("tenant_id","namespace");

CREATE TABLE "i18n_values" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "key_id" UUID NOT NULL, "locale" VARCHAR(10) NOT NULL, "value" TEXT NOT NULL,
  CONSTRAINT "i18n_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "i18n_values_key_locale_key" UNIQUE ("key_id","locale"),
  CONSTRAINT "i18n_values_key_fkey" FOREIGN KEY ("key_id") REFERENCES "i18n_keys"("id") ON DELETE CASCADE
);
