-- Phase 53: Field Service Management

CREATE TABLE "fsm_work_orders" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "title"         VARCHAR(300) NOT NULL,
  "type"          VARCHAR(50) NOT NULL DEFAULT 'maintenance',
  "priority"      VARCHAR(10) NOT NULL DEFAULT 'medium',
  "status"        VARCHAR(30) NOT NULL DEFAULT 'open',
  "customer_id"   UUID,
  "customer_name" VARCHAR(200),
  "location"      VARCHAR(500),
  "latitude"      DECIMAL(10,8),
  "longitude"     DECIMAL(11,8),
  "assigned_to"   UUID,
  "scheduled_at"  TIMESTAMPTZ,
  "started_at"    TIMESTAMPTZ,
  "completed_at"  TIMESTAMPTZ,
  "sla_due_at"    TIMESTAMPTZ,
  "description"   TEXT,
  "resolution"    TEXT,
  "parts_used"    JSONB       NOT NULL DEFAULT '[]',
  "labor_hours"   DECIMAL(8,2) NOT NULL DEFAULT 0,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fsm_work_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fsm_work_orders_tenant_status_idx" ON "fsm_work_orders"("tenant_id","status","priority");
CREATE INDEX "fsm_work_orders_assigned_idx" ON "fsm_work_orders"("assigned_to","scheduled_at");
ALTER TABLE "fsm_work_orders" ADD CONSTRAINT "fsm_work_orders_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "fsm_technicians" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "skills"      JSONB       NOT NULL DEFAULT '[]',
  "territory"   VARCHAR(200),
  "is_available" BOOLEAN    NOT NULL DEFAULT true,
  "current_lat" DECIMAL(10,8),
  "current_lng" DECIMAL(11,8),
  "location_updated_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fsm_technicians_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fsm_technicians_user_idx" ON "fsm_technicians"("tenant_id","user_id");
ALTER TABLE "fsm_technicians" ADD CONSTRAINT "fsm_technicians_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "fsm_checklists" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "work_order_id" UUID        NOT NULL,
  "item"          VARCHAR(300) NOT NULL,
  "is_done"       BOOLEAN     NOT NULL DEFAULT false,
  "done_at"       TIMESTAMPTZ,
  "done_by"       UUID,
  "order_index"   INTEGER     NOT NULL DEFAULT 0,
  CONSTRAINT "fsm_checklists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fsm_checklists_wo_idx" ON "fsm_checklists"("work_order_id","order_index");
ALTER TABLE "fsm_checklists" ADD CONSTRAINT "fsm_checklists_wo_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "fsm_work_orders"("id") ON DELETE CASCADE;
