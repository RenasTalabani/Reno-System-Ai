-- Phase 51: Multi-Currency & Global Finance

CREATE TABLE "fx_currencies" (
  "code"        VARCHAR(3)  NOT NULL,
  "name"        VARCHAR(100) NOT NULL,
  "symbol"      VARCHAR(10) NOT NULL,
  "is_active"   BOOLEAN     NOT NULL DEFAULT true,
  CONSTRAINT "fx_currencies_pkey" PRIMARY KEY ("code")
);
INSERT INTO "fx_currencies" VALUES
  ('USD','US Dollar','$',true),('EUR','Euro','€',true),('GBP','British Pound','£',true),
  ('JPY','Japanese Yen','¥',true),('CAD','Canadian Dollar','CA$',true),
  ('AUD','Australian Dollar','AU$',true),('CHF','Swiss Franc','Fr',true),
  ('CNY','Chinese Yuan','¥',true),('SEK','Swedish Krona','kr',true),
  ('NOK','Norwegian Krone','kr',true),('DKK','Danish Krone','kr',true),
  ('SGD','Singapore Dollar','S$',true),('HKD','Hong Kong Dollar','HK$',true),
  ('AED','UAE Dirham','د.إ',true),('INR','Indian Rupee','₹',true);

CREATE TABLE "fx_rates" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "from_currency" VARCHAR(3)  NOT NULL,
  "to_currency"   VARCHAR(3)  NOT NULL,
  "rate"          DECIMAL(18,8) NOT NULL,
  "source"        VARCHAR(30) NOT NULL DEFAULT 'manual',
  "effective_date" DATE       NOT NULL DEFAULT CURRENT_DATE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fx_rates_tenant_pair_date_idx" ON "fx_rates"("tenant_id","from_currency","to_currency","effective_date");
CREATE INDEX "fx_rates_tenant_idx" ON "fx_rates"("tenant_id","effective_date" DESC);
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "fx_tenant_settings" (
  "tenant_id"       UUID       NOT NULL,
  "base_currency"   VARCHAR(3) NOT NULL DEFAULT 'USD',
  "enabled_currencies" JSONB   NOT NULL DEFAULT '["USD"]',
  "auto_update_rates"  BOOLEAN NOT NULL DEFAULT false,
  "rate_source"     VARCHAR(30) NOT NULL DEFAULT 'manual',
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fx_tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);
ALTER TABLE "fx_tenant_settings" ADD CONSTRAINT "fx_tenant_settings_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
