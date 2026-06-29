-- Phase 94: Supplier Portal
CREATE TABLE IF NOT EXISTS "supl_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "code" VARCHAR(50),
  "category" VARCHAR(100),
  "country" VARCHAR(3),
  "email" VARCHAR(300),
  "phone" VARCHAR(30),
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "risk_level" VARCHAR(20) NOT NULL DEFAULT 'low',
  "onboarded_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supl_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supl_profiles_tenant_code_key" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "supl_profiles_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "supl_profiles_tenant_id_idx" ON "supl_profiles"("tenant_id");

CREATE TABLE IF NOT EXISTS "supl_scorecards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplier_id" UUID NOT NULL,
  "period" VARCHAR(20) NOT NULL,
  "quality" INTEGER,
  "delivery" INTEGER,
  "price" INTEGER,
  "compliance" INTEGER,
  "overall" DECIMAL(5,2),
  "notes" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supl_scorecards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supl_scorecards_supplier_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supl_profiles"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "supl_scorecards_supplier_idx" ON "supl_scorecards"("supplier_id");

CREATE TABLE IF NOT EXISTS "supl_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplier_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "file_url" VARCHAR(1000) NOT NULL,
  "expires_at" DATE,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "supl_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supl_documents_supplier_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supl_profiles"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "supl_documents_supplier_idx" ON "supl_documents"("supplier_id");