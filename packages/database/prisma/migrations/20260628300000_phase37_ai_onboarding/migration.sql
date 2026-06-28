-- Phase 37: AI Company Setup & Industry Autopilot
-- Creates onboarding session, answers, plan, plan items, industry templates, audit log

CREATE TABLE IF NOT EXISTS "ai_onboarding_sessions" (
  "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID          NOT NULL,
  "status"            VARCHAR(30)   NOT NULL DEFAULT 'in_progress',
  "current_step"      INTEGER       NOT NULL DEFAULT 0,
  "total_steps"       INTEGER       NOT NULL DEFAULT 10,
  "company_type"      VARCHAR(100),
  "company_size"      VARCHAR(50),
  "country"           VARCHAR(100),
  "currency"          VARCHAR(10),
  "branches"          INTEGER,
  "employees"         INTEGER,
  "services"          JSONB,
  "products"          JSONB,
  "goals"             JSONB,
  "detected_industry" VARCHAR(100),
  "industry_confidence" DOUBLE PRECISION,
  "resume_token"      VARCHAR(100),
  "completed_at"      TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_onboarding_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_onboarding_sessions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "ai_onboarding_sessions_resume_token_key" UNIQUE ("resume_token")
);
CREATE INDEX IF NOT EXISTS "ai_onboarding_sessions_tenant_status_idx" ON "ai_onboarding_sessions"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "ai_onboarding_answers" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID          NOT NULL,
  "session_id"  UUID          NOT NULL,
  "step_key"    VARCHAR(100)  NOT NULL,
  "question"    TEXT          NOT NULL,
  "answer"      JSONB         NOT NULL,
  "answered_at" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_onboarding_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_onboarding_answers_session_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_onboarding_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "ai_onboarding_answers_session_step_key" UNIQUE ("session_id", "step_key")
);
CREATE INDEX IF NOT EXISTS "ai_onboarding_answers_tenant_idx" ON "ai_onboarding_answers"("tenant_id");

CREATE TABLE IF NOT EXISTS "ai_onboarding_plans" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID          NOT NULL,
  "session_id"    UUID          NOT NULL,
  "industry"      VARCHAR(100)  NOT NULL,
  "template_used" VARCHAR(100),
  "summary"       TEXT          NOT NULL,
  "status"        VARCHAR(30)   NOT NULL DEFAULT 'pending',
  "approved_by"   UUID,
  "approved_at"   TIMESTAMPTZ,
  "applied_at"    TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_onboarding_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_onboarding_plans_session_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_onboarding_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "ai_onboarding_plans_tenant_status_idx" ON "ai_onboarding_plans"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "ai_onboarding_plan_items" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "plan_id"     UUID          NOT NULL,
  "category"    VARCHAR(50)   NOT NULL,
  "title"       VARCHAR(200)  NOT NULL,
  "description" TEXT          NOT NULL,
  "config"      JSONB,
  "status"      VARCHAR(30)   NOT NULL DEFAULT 'pending',
  "order"       INTEGER       NOT NULL DEFAULT 0,
  "applied_at"  TIMESTAMPTZ,
  "error"       TEXT,
  CONSTRAINT "ai_onboarding_plan_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_onboarding_plan_items_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "ai_onboarding_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "ai_onboarding_plan_items_plan_status_idx" ON "ai_onboarding_plan_items"("plan_id", "status");

CREATE TABLE IF NOT EXISTS "ai_industry_templates" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "slug"        VARCHAR(100)  NOT NULL,
  "name"        VARCHAR(200)  NOT NULL,
  "description" TEXT          NOT NULL,
  "modules"     JSONB         NOT NULL DEFAULT '[]',
  "roles"       JSONB         NOT NULL DEFAULT '[]',
  "workflows"   JSONB         NOT NULL DEFAULT '[]',
  "dashboards"  JSONB         NOT NULL DEFAULT '[]',
  "reports"     JSONB         NOT NULL DEFAULT '[]',
  "agents"      JSONB         NOT NULL DEFAULT '[]',
  "keywords"    JSONB         NOT NULL DEFAULT '[]',
  "is_active"   BOOLEAN       NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_industry_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_industry_templates_slug_key" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "ai_onboarding_audit_logs" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID          NOT NULL,
  "session_id"    UUID          NOT NULL,
  "action"        VARCHAR(100)  NOT NULL,
  "details"       JSONB,
  "performed_by"  UUID,
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_onboarding_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_onboarding_audit_logs_session_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_onboarding_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "ai_onboarding_audit_logs_tenant_created_idx" ON "ai_onboarding_audit_logs"("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ai_onboarding_audit_logs_session_idx" ON "ai_onboarding_audit_logs"("session_id");

-- ─── Seed: 7 Industry Templates ──────────────────────────────────────────────

INSERT INTO "ai_industry_templates" ("slug","name","description","modules","roles","workflows","dashboards","reports","agents","keywords") VALUES
(
  'gym',
  'Gym & Fitness Center',
  'Complete setup for gyms, fitness clubs, yoga studios and sports centers with membership management, trainer scheduling and attendance.',
  '["hr","attendance","sales","finance","portal_customer","helpdesk","comm","analytics","brain"]',
  '[{"name":"Gym Manager","permissions":["all"]},{"name":"Personal Trainer","permissions":["attendance","crm"]},{"name":"Front Desk","permissions":["sales","crm","attendance"]}]',
  '[{"name":"Member Onboarding","description":"Register new member, assign trainer, schedule orientation session, send welcome email"},{"name":"Membership Renewal","description":"Auto-notify members 7 days before expiry, process renewal payment, update membership period"},{"name":"Trainer Assignment","description":"Match member goals to available trainer, book initial session, notify both parties"}]',
  '[{"name":"Gym Overview","widgets":["active_members","revenue_today","attendance_today","class_bookings"]}]',
  '["Monthly Revenue","Member Attendance","Trainer Performance","Class Utilization","Membership Churn"]',
  '["hr-director","sales-director","cs-manager"]',
  '["gym","fitness","membership","training","workout","yoga","pilates","sports club","health club","exercise","personal trainer"]'
),
(
  'logistics',
  'Logistics & Transportation',
  'End-to-end logistics platform for freight, delivery, fleet management and supply chain operations.',
  '["crm","inventory","procurement","finance","portal_customer","docs","analytics","automation","brain"]',
  '[{"name":"Operations Manager","permissions":["all"]},{"name":"Driver","permissions":["attendance","docs"]},{"name":"Dispatcher","permissions":["crm","inventory","comm"]}]',
  '[{"name":"Shipment Processing","description":"Create shipment order, assign driver and vehicle, track delivery, confirm completion and invoice"},{"name":"Fleet Maintenance","description":"Schedule preventive maintenance based on mileage and time intervals, alert mechanics"},{"name":"Customer Delivery Alert","description":"Auto-notify customer when shipment is dispatched and confirmed delivered"}]',
  '[{"name":"Logistics Overview","widgets":["active_shipments","fleet_status","on_time_delivery_rate","revenue_this_month"]}]',
  '["Delivery Performance","Fleet Utilization","Revenue by Route","Customer Satisfaction","Fuel Costs"]',
  '["coo","procurement-director","cs-manager","data-analyst"]',
  '["logistics","shipping","freight","transport","delivery","fleet","trucking","cargo","warehouse","supply chain","courier"]'
),
(
  'manufacturing',
  'Manufacturing & Production',
  'Full manufacturing ERP with production orders, material planning, quality control and machine scheduling.',
  '["inventory","procurement","manufacturing","finance","analytics","brain","hr","docs"]',
  '[{"name":"Production Manager","permissions":["manufacturing","inventory","procurement"]},{"name":"Quality Inspector","permissions":["manufacturing","docs"]},{"name":"Machine Operator","permissions":["attendance"]}]',
  '[{"name":"Production Order","description":"Create production order, allocate raw materials, schedule machines, track progress, mandatory QC gate before completion"},{"name":"Material Reorder","description":"Auto-create purchase order when stock falls below minimum threshold, notify procurement"},{"name":"Quality Inspection","description":"Trigger QC checklist on work order completion, log results, reject or approve batch"}]',
  '[{"name":"Manufacturing Floor","widgets":["production_orders_active","material_stock_level","quality_pass_rate","machine_utilization"]}]',
  '["Production Efficiency","Material Consumption","Quality Control Report","Cost of Production","Machine Downtime"]',
  '["production-director","inventory-manager","procurement-director","cfo"]',
  '["manufacturing","factory","production","assembly","fabrication","machining","plant","quality control","mrp","production line","industrial"]'
),
(
  'retail',
  'Retail & E-Commerce',
  'Omnichannel retail setup with POS, inventory, CRM and marketplace integration.',
  '["crm","sales","inventory","finance","portal_customer","marketplace","analytics","brain","hr"]',
  '[{"name":"Store Manager","permissions":["all"]},{"name":"Sales Associate","permissions":["sales","crm","inventory"]},{"name":"Cashier","permissions":["sales"]}]',
  '[{"name":"Sales Order","description":"Create sale from POS or online, apply discounts and promotions, process payment, issue digital receipt"},{"name":"Inventory Restock","description":"Auto-create purchase order when SKU stock falls below minimum level, notify supplier"},{"name":"Customer Loyalty","description":"Award loyalty points on every purchase, send reward notifications, apply discounts at next checkout"}]',
  '[{"name":"Retail Dashboard","widgets":["daily_sales","top_selling_products","inventory_alerts","customer_footfall"]}]',
  '["Daily Sales Report","Inventory Turnover","Best Selling Products","Customer Purchase History","Margin Analysis"]',
  '["sales-director","inventory-manager","cs-manager","marketing-director"]',
  '["retail","shop","store","ecommerce","e-commerce","boutique","supermarket","market","point of sale","pos","merchandise"]'
),
(
  'healthcare',
  'Healthcare & Clinic',
  'Clinic and hospital management with patient records, appointment scheduling and billing.',
  '["hr","attendance","crm","finance","portal_customer","helpdesk","docs","analytics","brain","comm"]',
  '[{"name":"Medical Director","permissions":["all"]},{"name":"Doctor","permissions":["crm","docs","portal_customer"]},{"name":"Nurse","permissions":["crm","docs","attendance"]},{"name":"Receptionist","permissions":["crm","portal_customer","finance"]}]',
  '[{"name":"Patient Registration","description":"Register patient, collect insurance information, assign primary doctor, create medical record"},{"name":"Appointment Booking","description":"Book appointment with preferred doctor, send reminder 24h before, handle cancellation and rescheduling"},{"name":"Medical Records Management","description":"Secure patient record storage with role-based access, prescription history and lab results"}]',
  '[{"name":"Clinic Overview","widgets":["appointments_today","patients_waiting","doctor_availability","revenue_this_week"]}]',
  '["Patient Visit Report","Revenue by Service","Doctor Performance","Insurance Claims","Medication Dispensed"]',
  '["hr-director","compliance-officer","cs-manager","data-analyst"]',
  '["healthcare","clinic","hospital","medical","doctor","patient","pharmacy","dental","nursing","health","physiotherapy","diagnostics"]'
),
(
  'education',
  'Education & Training',
  'School, university and training center management with enrollment, attendance, fee collection and academic tracking.',
  '["hr","attendance","crm","finance","portal_customer","portal_employee","docs","analytics","brain","comm"]',
  '[{"name":"Principal","permissions":["all"]},{"name":"Teacher","permissions":["attendance","crm","docs","portal_employee"]},{"name":"Student","permissions":["portal_customer","docs"]},{"name":"Admin Staff","permissions":["hr","finance","crm"]}]',
  '[{"name":"Student Enrollment","description":"Register student, collect documents and parent info, assign class and teacher, send welcome letter"},{"name":"Fee Collection","description":"Generate term fee invoice, send payment reminders, record payment, issue official receipt"},{"name":"Attendance Tracking","description":"Daily class attendance by teacher, automated parent notification for absences, monthly attendance report"}]',
  '[{"name":"School Overview","widgets":["total_enrollment","attendance_rate_today","fee_collection_this_term","upcoming_exams"]}]',
  '["Attendance Report","Fee Collection Report","Academic Performance","Teacher Utilization","Enrollment Trends"]',
  '["hr-director","data-analyst","cs-manager"]',
  '["education","school","university","college","academy","training center","e-learning","students","courses","tutoring","institute","campus"]'
),
(
  'services',
  'Professional Services',
  'Agency, consulting and professional services firm management with project tracking, client billing and team utilization.',
  '["crm","pm","finance","hr","docs","portal_customer","helpdesk","analytics","brain","comm"]',
  '[{"name":"Managing Director","permissions":["all"]},{"name":"Project Manager","permissions":["pm","crm","hr","finance"]},{"name":"Consultant","permissions":["pm","docs","crm"]},{"name":"Finance Officer","permissions":["finance","docs"]}]',
  '[{"name":"Client Onboarding","description":"Sign contract, create project in system, assign team, schedule kickoff meeting, send client portal access"},{"name":"Invoice Cycle","description":"Generate milestone invoice, send to client, track payment, send overdue reminders"},{"name":"Project Review","description":"Weekly project status update, risk flag escalation, automated stakeholder summary report"}]',
  '[{"name":"Services Overview","widgets":["active_projects","revenue_this_month","client_satisfaction_score","team_utilization_rate"]}]',
  '["Project Profitability","Client Revenue","Team Utilization","Invoice Aging","Proposal Win Rate"]',
  '["ceo","project-manager","business-analyst","cs-manager","legal-advisor"]',
  '["consulting","agency","professional services","law firm","accounting","marketing agency","it services","staffing","services","advisory","outsourcing"]'
);
