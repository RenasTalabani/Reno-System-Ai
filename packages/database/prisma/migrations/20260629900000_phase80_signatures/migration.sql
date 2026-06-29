-- Phase 80: Digital Signatures
CREATE TABLE "sig_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "document_url" VARCHAR(1000) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sig_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sig_requests_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "sig_requests_tenant_id_idx" ON "sig_requests"("tenant_id");

CREATE TABLE "sig_signers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "email" VARCHAR(300) NOT NULL,
  "role" VARCHAR(50) NOT NULL DEFAULT 'signer',
  "order" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "token" VARCHAR(200) NOT NULL,
  "signed_at" TIMESTAMPTZ,
  "ip_address" VARCHAR(50),
  CONSTRAINT "sig_signers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sig_signers_token_key" UNIQUE ("token"),
  CONSTRAINT "sig_signers_request_fkey" FOREIGN KEY ("request_id") REFERENCES "sig_requests"("id") ON DELETE CASCADE
);
CREATE INDEX "sig_signers_request_id_idx" ON "sig_signers"("request_id");
