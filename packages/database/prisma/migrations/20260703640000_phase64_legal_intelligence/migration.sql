CREATE TABLE "lci_contracts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "counterparty" TEXT,
  "contract_type" TEXT NOT NULL DEFAULT 'nda',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "value" DOUBLE PRECISION,
  "start_date" TIMESTAMPTZ,
  "end_date" TIMESTAMPTZ,
  "ai_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_risk_level" TEXT NOT NULL DEFAULT 'low',
  "ai_summary" TEXT,
  "key_obligations" JSONB NOT NULL DEFAULT '[]',
  "red_flags" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lci_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lci_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "lci_contracts_tenant_id_idx" ON "lci_contracts"("tenant_id");

CREATE TABLE "lci_clauses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "clause_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "ai_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_risk_level" TEXT NOT NULL DEFAULT 'low',
  "ai_annotation" TEXT,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lci_clauses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lci_clauses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "lci_clauses_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "lci_contracts"("id") ON DELETE CASCADE
);
CREATE INDEX "lci_clauses_tenant_id_idx" ON "lci_clauses"("tenant_id");

CREATE TABLE "lci_compliance_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "framework" TEXT NOT NULL,
  "requirement" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "due_date" TIMESTAMPTZ,
  "ai_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ai_guidance" TEXT,
  "evidence_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lci_compliance_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lci_compliance_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "lci_compliance_items_tenant_id_idx" ON "lci_compliance_items"("tenant_id");

CREATE TABLE "lci_legal_insights" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "action_items" JSONB NOT NULL DEFAULT '[]',
  "related_id" TEXT,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lci_legal_insights_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lci_legal_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "lci_legal_insights_tenant_id_idx" ON "lci_legal_insights"("tenant_id");