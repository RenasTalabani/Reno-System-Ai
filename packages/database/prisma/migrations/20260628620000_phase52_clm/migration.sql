-- Phase 52: Contract Lifecycle Management (CLM)

CREATE TABLE "clm_contracts" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL,
  "title"           VARCHAR(300) NOT NULL,
  "type"            VARCHAR(50) NOT NULL DEFAULT 'service',
  "status"          VARCHAR(30) NOT NULL DEFAULT 'draft',
  "counterparty"    VARCHAR(200),
  "counterparty_id" UUID,
  "value"           DECIMAL(18,2),
  "currency"        VARCHAR(3)  NOT NULL DEFAULT 'USD',
  "start_date"      DATE,
  "end_date"        DATE,
  "auto_renew"      BOOLEAN     NOT NULL DEFAULT false,
  "notice_days"     INTEGER     NOT NULL DEFAULT 30,
  "body"            TEXT,
  "summary"         TEXT,
  "tags"            JSONB       NOT NULL DEFAULT '[]',
  "signed_at"       TIMESTAMPTZ,
  "signed_by"       UUID,
  "created_by"      UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "clm_contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clm_contracts_tenant_status_idx" ON "clm_contracts"("tenant_id","status");
CREATE INDEX "clm_contracts_tenant_end_idx" ON "clm_contracts"("tenant_id","end_date");
ALTER TABLE "clm_contracts" ADD CONSTRAINT "clm_contracts_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "clm_clauses" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "contract_id" UUID        NOT NULL,
  "title"       VARCHAR(200) NOT NULL,
  "body"        TEXT        NOT NULL,
  "clause_type" VARCHAR(50) NOT NULL DEFAULT 'standard',
  "order_index" INTEGER     NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "clm_clauses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clm_clauses_contract_idx" ON "clm_clauses"("contract_id","order_index");
ALTER TABLE "clm_clauses" ADD CONSTRAINT "clm_clauses_contract_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "clm_contracts"("id") ON DELETE CASCADE;

CREATE TABLE "clm_approvals" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "contract_id" UUID        NOT NULL,
  "approver_id" UUID        NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
  "comments"    TEXT,
  "decided_at"  TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "clm_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clm_approvals_contract_idx" ON "clm_approvals"("contract_id");
ALTER TABLE "clm_approvals" ADD CONSTRAINT "clm_approvals_contract_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "clm_contracts"("id") ON DELETE CASCADE;
