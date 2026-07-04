-- Phase 97: Commercial Customer Portal

CREATE TABLE "cp_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "company_name" VARCHAR(150) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "industry" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'trial',
  "health_score" DOUBLE PRECISION NOT NULL DEFAULT 70,
  "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cp_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cp_accounts_tenant_id_slug_key" ON "cp_accounts"("tenant_id","slug");
CREATE INDEX "cp_accounts_tenant_id_idx" ON "cp_accounts"("tenant_id");
ALTER TABLE "cp_accounts" ADD CONSTRAINT "cp_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cp_contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(30) NOT NULL DEFAULT 'member',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cp_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cp_contacts_tenant_id_account_id_idx" ON "cp_contacts"("tenant_id","account_id");
ALTER TABLE "cp_contacts" ADD CONSTRAINT "cp_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cp_contacts" ADD CONSTRAINT "cp_contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cp_accounts"("id") ON DELETE CASCADE;

CREATE TABLE "cp_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "plan_ref" VARCHAR(100) NOT NULL,
  "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "renews_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cp_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cp_subscriptions_tenant_id_account_id_idx" ON "cp_subscriptions"("tenant_id","account_id");
ALTER TABLE "cp_subscriptions" ADD CONSTRAINT "cp_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cp_subscriptions" ADD CONSTRAINT "cp_subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cp_accounts"("id") ON DELETE CASCADE;

CREATE TABLE "cp_invoice_docs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "invoice_no" VARCHAR(50) NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "due_date" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "line_items" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cp_invoice_docs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cp_invoice_docs_tenant_id_invoice_no_key" ON "cp_invoice_docs"("tenant_id","invoice_no");
CREATE INDEX "cp_invoice_docs_tenant_id_account_id_idx" ON "cp_invoice_docs"("tenant_id","account_id");
ALTER TABLE "cp_invoice_docs" ADD CONSTRAINT "cp_invoice_docs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cp_invoice_docs" ADD CONSTRAINT "cp_invoice_docs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cp_accounts"("id") ON DELETE CASCADE;

CREATE TABLE "cp_announcements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "audience" VARCHAR(30) NOT NULL DEFAULT 'all',
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cp_announcements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cp_announcements_tenant_id_idx" ON "cp_announcements"("tenant_id");
ALTER TABLE "cp_announcements" ADD CONSTRAINT "cp_announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cp_support_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "body" TEXT,
  "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "replies" JSONB,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cp_support_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cp_support_requests_tenant_id_account_id_idx" ON "cp_support_requests"("tenant_id","account_id");
ALTER TABLE "cp_support_requests" ADD CONSTRAINT "cp_support_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "cp_support_requests" ADD CONSTRAINT "cp_support_requests_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cp_accounts"("id") ON DELETE CASCADE;