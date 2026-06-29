-- Phase 95: Loyalty 2.0
CREATE TABLE IF NOT EXISTS "lty2_tiers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "program_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "min_points" INTEGER NOT NULL DEFAULT 0,
  "max_points" INTEGER,
  "multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  "color" VARCHAR(20),
  "benefits" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "lty2_tiers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lty2_tiers_program_idx" ON "lty2_tiers"("program_id");

CREATE TABLE IF NOT EXISTS "lty2_rewards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "points_cost" INTEGER NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'discount',
  "value" DECIMAL(18,2),
  "stock" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lty2_rewards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lty2_rewards_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "lty2_rewards_tenant_id_idx" ON "lty2_rewards"("tenant_id");

CREATE TABLE IF NOT EXISTS "lty2_redemptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "member_id" UUID NOT NULL,
  "reward_id" UUID NOT NULL,
  "points_used" INTEGER NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lty2_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lty2_redemptions_reward_fkey" FOREIGN KEY ("reward_id") REFERENCES "lty2_rewards"("id")
);
CREATE INDEX IF NOT EXISTS "lty2_redemptions_member_idx" ON "lty2_redemptions"("member_id");
CREATE INDEX IF NOT EXISTS "lty2_redemptions_reward_idx" ON "lty2_redemptions"("reward_id");