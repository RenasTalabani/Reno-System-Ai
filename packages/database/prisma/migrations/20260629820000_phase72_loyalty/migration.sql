-- Phase 72: Customer Loyalty & Rewards
CREATE TABLE "loyalty_programs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "points_per_unit" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "tiers" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "loyalty_programs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_programs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "loyalty_programs_tenant_id_idx" ON "loyalty_programs"("tenant_id");

CREATE TABLE "loyalty_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "tier" VARCHAR(50) NOT NULL DEFAULT 'bronze',
  "points" INTEGER NOT NULL DEFAULT 0,
  "lifetime_points" INTEGER NOT NULL DEFAULT 0,
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "loyalty_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_members_program_customer_key" UNIQUE ("program_id", "customer_id"),
  CONSTRAINT "loyalty_members_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "loyalty_members_program_fkey" FOREIGN KEY ("program_id") REFERENCES "loyalty_programs"("id")
);
CREATE INDEX "loyalty_members_tenant_id_idx" ON "loyalty_members"("tenant_id");

CREATE TABLE "loyalty_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "member_id" UUID NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "points" INTEGER NOT NULL,
  "description" VARCHAR(300),
  "ref_id" UUID,
  "ref_type" VARCHAR(50),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loyalty_transactions_member_fkey" FOREIGN KEY ("member_id") REFERENCES "loyalty_members"("id") ON DELETE CASCADE
);
CREATE INDEX "loyalty_transactions_member_id_idx" ON "loyalty_transactions"("member_id");
