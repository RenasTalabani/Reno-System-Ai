-- Phase 33: Claude Tool Calling for Reno
-- New table: claude_tool_calls (audit log for every Claude tool invocation)

CREATE TABLE "claude_tool_calls" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID          NOT NULL,
  "user_id"         UUID          NOT NULL,
  "conversation_id" UUID,
  "tool_name"       VARCHAR(100)  NOT NULL,
  "tool_call_id"    VARCHAR(100)  NOT NULL,
  "tool_input"      JSONB         NOT NULL,
  "tool_output"     JSONB,
  "status"          VARCHAR(20)   NOT NULL DEFAULT 'success',
  "duration_ms"     INTEGER,
  "error_message"   VARCHAR(1000),
  "proposal_id"     UUID,
  "occurred_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "claude_tool_calls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "claude_tool_calls_tenant_id_occurred_at_idx" ON "claude_tool_calls"("tenant_id", "occurred_at" DESC);
CREATE INDEX "claude_tool_calls_tenant_id_tool_name_idx"   ON "claude_tool_calls"("tenant_id", "tool_name");

ALTER TABLE "claude_tool_calls"
  ADD CONSTRAINT "claude_tool_calls_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Note: ai_exec_proposals already exists (Phase 22+). Phase 33 reuses it
-- with proposalType = 'create_task' | 'create_workflow' | 'create_invoice_draft'
--                   | 'create_purchase_order' | 'create_support_reply'
