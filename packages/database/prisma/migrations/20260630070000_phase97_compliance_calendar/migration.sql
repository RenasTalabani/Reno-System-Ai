-- Phase 97: Compliance Calendar
CREATE TABLE IF NOT EXISTS "cc_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "regulation" VARCHAR(100),
  "jurisdiction" VARCHAR(50),
  "due_date" DATE NOT NULL,
  "recurrence" VARCHAR(20),
  "assignee_id" UUID,
  "status" VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  "notes" TEXT,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cc_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cc_events_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "cc_events_tenant_id_idx" ON "cc_events"("tenant_id");
CREATE INDEX IF NOT EXISTS "cc_events_tenant_due_idx" ON "cc_events"("tenant_id", "due_date");

CREATE TABLE IF NOT EXISTS "cc_reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "days_before" INTEGER NOT NULL,
  "channel" VARCHAR(20) NOT NULL DEFAULT 'email',
  "sent_at" TIMESTAMPTZ,
  CONSTRAINT "cc_reminders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cc_reminders_event_fkey" FOREIGN KEY ("event_id") REFERENCES "cc_events"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "cc_reminders_event_idx" ON "cc_reminders"("event_id");