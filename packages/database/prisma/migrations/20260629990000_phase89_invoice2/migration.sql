-- Phase 89: Invoice & Payments 2.0
CREATE TABLE IF NOT EXISTS "inv2_quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "number" VARCHAR(50) NOT NULL,
  "client_name" VARCHAR(300) NOT NULL,
  "client_email" VARCHAR(300) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "type" VARCHAR(20) NOT NULL DEFAULT 'quote',
  "valid_until" DATE,
  "notes" TEXT,
  "terms" TEXT,
  "sent_at" TIMESTAMPTZ,
  "accepted_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "inv2_quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inv2_quotes_tenant_number_key" UNIQUE ("tenant_id", "number"),
  CONSTRAINT "inv2_quotes_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "inv2_quotes_tenant_id_idx" ON "inv2_quotes"("tenant_id");

CREATE TABLE IF NOT EXISTS "inv2_quote_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quote_id" UUID NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(18,4) NOT NULL,
  "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(18,2) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "inv2_quote_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inv2_quote_items_quote_fkey" FOREIGN KEY ("quote_id") REFERENCES "inv2_quotes"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "inv2_quote_items_quote_idx" ON "inv2_quote_items"("quote_id");

CREATE TABLE IF NOT EXISTS "inv2_payment_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "quote_id" UUID,
  "token" VARCHAR(200) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "description" VARCHAR(500),
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "inv2_payment_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inv2_payment_links_token_key" UNIQUE ("token"),
  CONSTRAINT "inv2_payment_links_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "inv2_payment_links_quote_fkey" FOREIGN KEY ("quote_id") REFERENCES "inv2_quotes"("id")
);
CREATE INDEX IF NOT EXISTS "inv2_payment_links_tenant_id_idx" ON "inv2_payment_links"("tenant_id");