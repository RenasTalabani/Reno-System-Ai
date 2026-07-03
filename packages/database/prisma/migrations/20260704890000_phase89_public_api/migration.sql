-- Phase 89: Public API Portal

CREATE TABLE "pub_api_clients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "client_type" VARCHAR(30) NOT NULL DEFAULT 'server',
  "contact_email" VARCHAR(255),
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "tier" VARCHAR(30) NOT NULL DEFAULT 'free',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pub_api_clients_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pub_api_clients_tenant_id_idx" ON "pub_api_clients"("tenant_id");
ALTER TABLE "pub_api_clients" ADD CONSTRAINT "pub_api_clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "pub_api_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "key_prefix" VARCHAR(20) NOT NULL,
  "key_hash" VARCHAR(128) NOT NULL,
  "label" VARCHAR(100),
  "scopes" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pub_api_keys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pub_api_keys_tenant_id_client_id_idx" ON "pub_api_keys"("tenant_id","client_id");
CREATE INDEX "pub_api_keys_key_prefix_idx" ON "pub_api_keys"("key_prefix");
ALTER TABLE "pub_api_keys" ADD CONSTRAINT "pub_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pub_api_keys" ADD CONSTRAINT "pub_api_keys_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "pub_api_clients"("id") ON DELETE CASCADE;

CREATE TABLE "pub_usage_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "endpoint" VARCHAR(255) NOT NULL,
  "method" VARCHAR(10) NOT NULL DEFAULT 'GET',
  "status_code" INTEGER NOT NULL DEFAULT 200,
  "latency_ms" INTEGER NOT NULL DEFAULT 0,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pub_usage_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pub_usage_records_tenant_id_client_id_recorded_at_idx" ON "pub_usage_records"("tenant_id","client_id","recorded_at");
ALTER TABLE "pub_usage_records" ADD CONSTRAINT "pub_usage_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pub_usage_records" ADD CONSTRAINT "pub_usage_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "pub_api_clients"("id") ON DELETE CASCADE;

CREATE TABLE "pub_quotas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "quota_type" VARCHAR(30) NOT NULL DEFAULT 'requests-per-day',
  "limit_value" INTEGER NOT NULL,
  "used_value" INTEGER NOT NULL DEFAULT 0,
  "resets_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pub_quotas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pub_quotas_client_id_quota_type_key" ON "pub_quotas"("client_id","quota_type");
CREATE INDEX "pub_quotas_tenant_id_idx" ON "pub_quotas"("tenant_id");
ALTER TABLE "pub_quotas" ADD CONSTRAINT "pub_quotas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pub_quotas" ADD CONSTRAINT "pub_quotas_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "pub_api_clients"("id") ON DELETE CASCADE;

CREATE TABLE "pub_doc_pages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(200) NOT NULL,
  "content" TEXT NOT NULL,
  "category" VARCHAR(50) NOT NULL DEFAULT 'guides',
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pub_doc_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pub_doc_pages_tenant_id_slug_key" ON "pub_doc_pages"("tenant_id","slug");
CREATE INDEX "pub_doc_pages_tenant_id_idx" ON "pub_doc_pages"("tenant_id");
ALTER TABLE "pub_doc_pages" ADD CONSTRAINT "pub_doc_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "pub_status_incidents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'minor',
  "status" VARCHAR(30) NOT NULL DEFAULT 'investigating',
  "affected_apis" JSONB,
  "updates" JSONB,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pub_status_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pub_status_incidents_tenant_id_idx" ON "pub_status_incidents"("tenant_id");
ALTER TABLE "pub_status_incidents" ADD CONSTRAINT "pub_status_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;