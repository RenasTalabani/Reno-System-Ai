-- Phase 58: Customer Success Platform

CREATE TABLE "cs_accounts" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "name"            VARCHAR(300) NOT NULL,
  "plan"            VARCHAR(100),
  "mrr"             DECIMAL(18,2) NOT NULL DEFAULT 0,
  "arr"             DECIMAL(18,2) NOT NULL DEFAULT 0,
  "health_score"    SMALLINT    NOT NULL DEFAULT 50,
  "stage"           VARCHAR(50) NOT NULL DEFAULT 'onboarding',
  "csm_id"          UUID,
  "renewal_date"    DATE,
  "churn_risk"      VARCHAR(20) NOT NULL DEFAULT 'low',
  "nps_score"       SMALLINT,
  "contacts"        JSONB       NOT NULL DEFAULT '[]',
  "tags"            JSONB       NOT NULL DEFAULT '[]',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cs_accounts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cs_accounts_tenant_idx" ON "cs_accounts"("tenant_id","stage");
CREATE INDEX "cs_accounts_csm_idx" ON "cs_accounts"("csm_id");
ALTER TABLE "cs_accounts" ADD CONSTRAINT "cs_accounts_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "cs_touchpoints" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "account_id"  UUID        NOT NULL,
  "type"        VARCHAR(50) NOT NULL DEFAULT 'call',
  "subject"     VARCHAR(300),
  "notes"       TEXT,
  "outcome"     VARCHAR(50),
  "sentiment"   VARCHAR(20) NOT NULL DEFAULT 'neutral',
  "created_by"  UUID,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cs_touchpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cs_touchpoints_account_idx" ON "cs_touchpoints"("account_id","occurred_at");
ALTER TABLE "cs_touchpoints" ADD CONSTRAINT "cs_touchpoints_account_fkey"
  FOREIGN KEY ("account_id") REFERENCES "cs_accounts"("id") ON DELETE CASCADE;

CREATE TABLE "cs_success_plans" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "account_id"  UUID        NOT NULL,
  "title"       VARCHAR(300) NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'active',
  "goals"       JSONB       NOT NULL DEFAULT '[]',
  "milestones"  JSONB       NOT NULL DEFAULT '[]',
  "due_date"    DATE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cs_success_plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cs_success_plans_account_idx" ON "cs_success_plans"("account_id");
ALTER TABLE "cs_success_plans" ADD CONSTRAINT "cs_success_plans_account_fkey"
  FOREIGN KEY ("account_id") REFERENCES "cs_accounts"("id") ON DELETE CASCADE;
