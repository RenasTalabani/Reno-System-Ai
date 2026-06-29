-- Phase 79: Risk Management
CREATE TABLE "risk_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(100) NOT NULL,
  "likelihood" INTEGER NOT NULL DEFAULT 3,
  "impact" INTEGER NOT NULL DEFAULT 3,
  "score" INTEGER NOT NULL DEFAULT 9,
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "owner" UUID,
  "mitigation" TEXT,
  "residual_score" INTEGER,
  "review_date" DATE,
  "closed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "risk_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "risk_items_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "risk_items_tenant_id_idx" ON "risk_items"("tenant_id");

CREATE TABLE "risk_assessments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "risk_id" UUID NOT NULL,
  "assessed_by" UUID NOT NULL,
  "likelihood" INTEGER NOT NULL,
  "impact" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "notes" TEXT,
  "assessed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "risk_assessments_risk_fkey" FOREIGN KEY ("risk_id") REFERENCES "risk_items"("id") ON DELETE CASCADE
);
CREATE INDEX "risk_assessments_risk_id_idx" ON "risk_assessments"("risk_id");
