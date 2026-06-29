-- Phase 92: Multi-Currency Treasury
CREATE TABLE IF NOT EXISTS "trs_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "account_no" VARCHAR(50),
  "bank_name" VARCHAR(200),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "type" VARCHAR(30) NOT NULL DEFAULT 'checking',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "trs_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trs_accounts_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "trs_accounts_tenant_id_idx" ON "trs_accounts"("tenant_id");

CREATE TABLE IF NOT EXISTS "trs_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "fx_rate" DECIMAL(18,8),
  "description" VARCHAR(500),
  "reference" VARCHAR(100),
  "value_date" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "trs_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trs_transactions_account_fkey" FOREIGN KEY ("account_id") REFERENCES "trs_accounts"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "trs_transactions_account_idx" ON "trs_transactions"("account_id");

CREATE TABLE IF NOT EXISTS "trs_fx_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "from_ccy" VARCHAR(3) NOT NULL,
  "to_ccy" VARCHAR(3) NOT NULL,
  "rate" DECIMAL(18,8) NOT NULL,
  "source" VARCHAR(50),
  "rate_date" DATE NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "trs_fx_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trs_fx_rates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "trs_fx_rates_unique_key" UNIQUE ("tenant_id", "from_ccy", "to_ccy", "rate_date")
);
CREATE INDEX IF NOT EXISTS "trs_fx_rates_tenant_id_idx" ON "trs_fx_rates"("tenant_id");