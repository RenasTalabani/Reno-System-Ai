-- Phase 86: Event Management
CREATE TABLE IF NOT EXISTS "evt_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "location" VARCHAR(300),
  "is_virtual" BOOLEAN NOT NULL DEFAULT false,
  "meeting_link" VARCHAR(500),
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ NOT NULL,
  "capacity" INTEGER,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "evt_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evt_events_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "evt_events_tenant_id_idx" ON "evt_events"("tenant_id");

CREATE TABLE IF NOT EXISTS "evt_ticket_types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "quantity" INTEGER,
  "sold_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "evt_ticket_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evt_ticket_types_event_fkey" FOREIGN KEY ("event_id") REFERENCES "evt_events"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "evt_ticket_types_event_idx" ON "evt_ticket_types"("event_id");

CREATE TABLE IF NOT EXISTS "evt_registrations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "ticket_type_id" UUID,
  "attendee_name" VARCHAR(200) NOT NULL,
  "attendee_email" VARCHAR(300) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'registered',
  "checked_in_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "notes" VARCHAR(500),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "evt_registrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evt_registrations_event_fkey" FOREIGN KEY ("event_id") REFERENCES "evt_events"("id") ON DELETE CASCADE,
  CONSTRAINT "evt_registrations_ticket_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "evt_ticket_types"("id")
);
CREATE INDEX IF NOT EXISTS "evt_registrations_event_idx" ON "evt_registrations"("event_id");