-- Phase 31: AI Provider Foundation
-- Adds: AiProviderRegistry (system catalog), TenantAiConsent (per-tenant explicit consent),
--        AiProviderAuditLog (provider-specific audit trail)
-- Does NOT change existing BrainProviderConfig — encryption handled at service layer.

-- AI Provider Registry (system-wide catalog, no tenantId)
CREATE TABLE "ai_provider_registry" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug"            VARCHAR(50) NOT NULL,
  "name"            VARCHAR(100) NOT NULL,
  "description"     TEXT,
  "provider_type"   VARCHAR(50) NOT NULL,   -- internal | anthropic | openai | google | custom
  "default_model"   VARCHAR(100) NOT NULL,
  "capabilities"    TEXT[] DEFAULT ARRAY[]::TEXT[],
  "is_built_in"     BOOLEAN NOT NULL DEFAULT false,
  "is_enabled"      BOOLEAN NOT NULL DEFAULT true,
  "requires_api_key" BOOLEAN NOT NULL DEFAULT false,
  "requires_consent" BOOLEAN NOT NULL DEFAULT false,
  "docs_url"        VARCHAR(500),
  "icon_url"        VARCHAR(500),
  "sort_order"      INT NOT NULL DEFAULT 0,
  "metadata"        JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ai_provider_registry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_provider_registry_slug_key" ON "ai_provider_registry"("slug");
CREATE INDEX "ai_provider_registry_enabled" ON "ai_provider_registry"("is_enabled");

-- Seed registry with built-in providers
INSERT INTO "ai_provider_registry"
  ("slug", "name", "description", "provider_type", "default_model", "capabilities",
   "is_built_in", "is_enabled", "requires_api_key", "requires_consent", "sort_order")
VALUES
  ('reno_brain', 'Reno Brain', 'Default Reno AI — built-in, evidence-based, tenant-isolated. No external API required.',
   'internal', 'reno-brain-v1', ARRAY['chat','recommendations','briefing','memory','search'],
   true, true, false, false, 0),
  ('claude', 'Claude (Anthropic)', 'Claude AI by Anthropic. Optional — requires API key and tenant consent.',
   'anthropic', 'claude-sonnet-4-6', ARRAY['chat','tools','vision'],
   false, true, true, true, 1),
  ('openai', 'ChatGPT / OpenAI', 'GPT-4 and other OpenAI models. Optional — requires API key and tenant consent.',
   'openai', 'gpt-4o', ARRAY['chat','tools','vision','embeddings'],
   false, true, true, true, 2),
  ('google', 'Gemini (Google)', 'Google Gemini AI. Optional — requires API key and tenant consent.',
   'google', 'gemini-1.5-pro', ARRAY['chat','vision'],
   false, false, true, true, 3);

-- Tenant AI Consent (explicit per-tenant consent for external providers)
CREATE TABLE "tenant_ai_consents" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID NOT NULL,
  "provider_slug"     VARCHAR(50) NOT NULL,
  "consent_given"     BOOLEAN NOT NULL DEFAULT false,
  "consent_given_at"  TIMESTAMPTZ,
  "consent_given_by"  UUID,
  "consent_text"      TEXT,
  "revoked_at"        TIMESTAMPTZ,
  "revoked_by"        UUID,
  "revoke_reason"     VARCHAR(500),
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_ai_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_ai_consents_tenant_provider_key" ON "tenant_ai_consents"("tenant_id", "provider_slug");
CREATE INDEX "tenant_ai_consents_tenant_idx" ON "tenant_ai_consents"("tenant_id");

-- AI Provider Audit Log (provider-specific, immutable)
CREATE TABLE "ai_provider_audit_logs" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "user_id"          UUID,
  "provider_slug"    VARCHAR(50) NOT NULL,
  "action"           VARCHAR(50) NOT NULL,  -- call|test|enable|disable|consent|revoke|key_update|fallback
  "status"           VARCHAR(20) NOT NULL DEFAULT 'success', -- success|error|blocked|fallback
  "module"           VARCHAR(100),
  "request_summary"  TEXT,   -- sanitized summary (never raw PII)
  "response_status"  INT,
  "tokens_used"      INT,
  "latency_ms"       INT,
  "error_message"    VARCHAR(1000),
  "fallback_to"      VARCHAR(50),  -- if status=fallback, which provider was used
  "metadata"         JSONB,
  "occurred_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ai_provider_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_provider_audit_logs_tenant_idx" ON "ai_provider_audit_logs"("tenant_id", "occurred_at" DESC);
CREATE INDEX "ai_provider_audit_logs_provider_idx" ON "ai_provider_audit_logs"("tenant_id", "provider_slug");
CREATE INDEX "ai_provider_audit_logs_action_idx" ON "ai_provider_audit_logs"("tenant_id", "action");

-- Add encrypted_api_key column to BrainProviderConfig (keep original for migration period)
ALTER TABLE "brain_provider_configs"
  ADD COLUMN IF NOT EXISTS "encrypted_api_key" TEXT,
  ADD COLUMN IF NOT EXISTS "key_hint"          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "consent_verified"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "status"            VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "status_reason"     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "fallback_provider" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "fallback_enabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "module_overrides"  JSONB;
