-- Phase 49: Partner & Reseller Platform

CREATE TABLE "prtn_partners" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "name"            VARCHAR(200) NOT NULL,
  "type"            VARCHAR(30) NOT NULL DEFAULT 'reseller',
  "status"          VARCHAR(20) NOT NULL DEFAULT 'active',
  "contact_email"   VARCHAR(255),
  "contact_name"    VARCHAR(200),
  "website"         VARCHAR(500),
  "tier"            VARCHAR(20) NOT NULL DEFAULT 'standard',
  "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  "total_revenue"   DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_commission" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "meta"            JSONB       NOT NULL DEFAULT '{}',
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "prtn_partners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prtn_partners_tenant_idx" ON "prtn_partners"("tenant_id", "status");
ALTER TABLE "prtn_partners" ADD CONSTRAINT "prtn_partners_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "prtn_referrals" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "partner_id"  UUID        NOT NULL,
  "code"        VARCHAR(50) NOT NULL UNIQUE,
  "referred_tenant_id" UUID,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "deal_value"  DECIMAL(15,2),
  "commission"  DECIMAL(15,2),
  "paid_at"     TIMESTAMPTZ,
  "converted_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "prtn_referrals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prtn_referrals_partner_idx" ON "prtn_referrals"("partner_id");
CREATE INDEX "prtn_referrals_tenant_idx" ON "prtn_referrals"("tenant_id");
ALTER TABLE "prtn_referrals" ADD CONSTRAINT "prtn_referrals_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "prtn_referrals" ADD CONSTRAINT "prtn_referrals_partner_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "prtn_partners"("id") ON DELETE CASCADE;

CREATE TABLE "prtn_commissions" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "partner_id"  UUID        NOT NULL,
  "referral_id" UUID,
  "amount"      DECIMAL(15,2) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "period"      VARCHAR(7)  NOT NULL,
  "notes"       TEXT,
  "paid_at"     TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "prtn_commissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prtn_commissions_partner_idx" ON "prtn_commissions"("partner_id", "status");
ALTER TABLE "prtn_commissions" ADD CONSTRAINT "prtn_commissions_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "prtn_commissions" ADD CONSTRAINT "prtn_commissions_partner_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "prtn_partners"("id") ON DELETE CASCADE;

CREATE TABLE "prtn_deals" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "partner_id"  UUID        NOT NULL,
  "title"       VARCHAR(200) NOT NULL,
  "value"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "stage"       VARCHAR(30) NOT NULL DEFAULT 'prospecting',
  "close_date"  DATE,
  "notes"       TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "prtn_deals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prtn_deals_partner_idx" ON "prtn_deals"("partner_id", "stage");
ALTER TABLE "prtn_deals" ADD CONSTRAINT "prtn_deals_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "prtn_deals" ADD CONSTRAINT "prtn_deals_partner_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "prtn_partners"("id") ON DELETE CASCADE;
