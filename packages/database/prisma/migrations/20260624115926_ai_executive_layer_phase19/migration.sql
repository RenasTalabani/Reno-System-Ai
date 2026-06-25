-- CreateTable
CREATE TABLE "ai_digital_twins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "health_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "growth_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efficiency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overall_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financials" JSONB NOT NULL DEFAULT '{}',
    "sales_metrics" JSONB NOT NULL DEFAULT '{}',
    "hr_metrics" JSONB NOT NULL DEFAULT '{}',
    "operations_metrics" JSONB NOT NULL DEFAULT '{}',
    "customer_metrics" JSONB NOT NULL DEFAULT '{}',
    "inventory_metrics" JSONB NOT NULL DEFAULT '{}',
    "project_metrics" JSONB NOT NULL DEFAULT '{}',
    "communication_metrics" JSONB NOT NULL DEFAULT '{}',
    "ai_insights_summary" TEXT,
    "top_risks" JSONB NOT NULL DEFAULT '[]',
    "top_opportunities" JSONB NOT NULL DEFAULT '[]',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_digital_twins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exec_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "executive_role" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "period" VARCHAR(50) NOT NULL,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "sections" JSONB NOT NULL DEFAULT '[]',
    "ai_summary" TEXT,
    "key_metrics" JSONB NOT NULL DEFAULT '{}',
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "concerns" JSONB NOT NULL DEFAULT '[]',
    "next_actions" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "generated_by" UUID NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_exec_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exec_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "executive_role" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "impact_level" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "effort_level" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "proposed_actions" JSONB NOT NULL DEFAULT '[]',
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "implemented_at" TIMESTAMP(3),
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_exec_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exec_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "executive_role" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "context" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decision_date" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT,
    "factors" JSONB NOT NULL DEFAULT '[]',
    "alternatives" JSONB NOT NULL DEFAULT '[]',
    "lessons" TEXT,
    "confidence_at_time" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "actual_score" DOUBLE PRECISION,
    "decided_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_exec_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_exec_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "executive_role" VARCHAR(50) NOT NULL,
    "proposal_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "proposed_payload" JSONB NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "estimated_impact" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    "approval_note" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "execution_result" JSONB,
    "linked_entity_type" VARCHAR(50),
    "linked_entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_exec_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_biz_predictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "prediction_type" VARCHAR(50) NOT NULL,
    "executive_role" VARCHAR(50),
    "horizon" VARCHAR(20) NOT NULL,
    "prediction" JSONB NOT NULL,
    "narrative" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "key_drivers" JSONB NOT NULL DEFAULT '[]',
    "risk_factors" JSONB NOT NULL DEFAULT '[]',
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "actual_outcome" JSONB,
    "accuracy" DOUBLE PRECISION,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_biz_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "scenario_type" VARCHAR(30) NOT NULL DEFAULT 'what_if',
    "baseline_data" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "projections" JSONB NOT NULL DEFAULT '{}',
    "risk_factors" JSONB NOT NULL DEFAULT '[]',
    "narrative" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_knowledge_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "node_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_knowledge_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "from_node_id" UUID NOT NULL,
    "to_node_id" UUID NOT NULL,
    "relationship" VARCHAR(100) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_knowledge_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_lessons_learned" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "context" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "tags" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "related_decisions" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_lessons_learned_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_digital_twins_tenant_id_computed_at_idx" ON "ai_digital_twins"("tenant_id", "computed_at");

-- CreateIndex
CREATE INDEX "ai_exec_reports_tenant_id_report_type_idx" ON "ai_exec_reports"("tenant_id", "report_type");

-- CreateIndex
CREATE INDEX "ai_exec_reports_tenant_id_status_idx" ON "ai_exec_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ai_exec_recommendations_tenant_id_status_idx" ON "ai_exec_recommendations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ai_exec_recommendations_tenant_id_executive_role_idx" ON "ai_exec_recommendations"("tenant_id", "executive_role");

-- CreateIndex
CREATE INDEX "ai_exec_recommendations_tenant_id_priority_idx" ON "ai_exec_recommendations"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "ai_exec_decisions_tenant_id_executive_role_idx" ON "ai_exec_decisions"("tenant_id", "executive_role");

-- CreateIndex
CREATE INDEX "ai_exec_decisions_tenant_id_decision_date_idx" ON "ai_exec_decisions"("tenant_id", "decision_date");

-- CreateIndex
CREATE INDEX "ai_exec_proposals_tenant_id_status_idx" ON "ai_exec_proposals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ai_exec_proposals_tenant_id_proposal_type_idx" ON "ai_exec_proposals"("tenant_id", "proposal_type");

-- CreateIndex
CREATE INDEX "ai_biz_predictions_tenant_id_prediction_type_idx" ON "ai_biz_predictions"("tenant_id", "prediction_type");

-- CreateIndex
CREATE INDEX "ai_biz_predictions_tenant_id_computed_at_idx" ON "ai_biz_predictions"("tenant_id", "computed_at");

-- CreateIndex
CREATE INDEX "ai_scenarios_tenant_id_idx" ON "ai_scenarios"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_scenarios_tenant_id_scenario_type_idx" ON "ai_scenarios"("tenant_id", "scenario_type");

-- CreateIndex
CREATE INDEX "ai_knowledge_nodes_tenant_id_node_type_idx" ON "ai_knowledge_nodes"("tenant_id", "node_type");

-- CreateIndex
CREATE INDEX "ai_knowledge_edges_tenant_id_idx" ON "ai_knowledge_edges"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_knowledge_edges_from_node_id_to_node_id_relationship_key" ON "ai_knowledge_edges"("from_node_id", "to_node_id", "relationship");

-- CreateIndex
CREATE INDEX "ai_lessons_learned_tenant_id_category_idx" ON "ai_lessons_learned"("tenant_id", "category");

-- AddForeignKey
ALTER TABLE "ai_digital_twins" ADD CONSTRAINT "ai_digital_twins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exec_reports" ADD CONSTRAINT "ai_exec_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exec_recommendations" ADD CONSTRAINT "ai_exec_recommendations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exec_decisions" ADD CONSTRAINT "ai_exec_decisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_exec_proposals" ADD CONSTRAINT "ai_exec_proposals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_biz_predictions" ADD CONSTRAINT "ai_biz_predictions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scenarios" ADD CONSTRAINT "ai_scenarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_knowledge_nodes" ADD CONSTRAINT "ai_knowledge_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_knowledge_edges" ADD CONSTRAINT "ai_knowledge_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "ai_knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_knowledge_edges" ADD CONSTRAINT "ai_knowledge_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "ai_knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_lessons_learned" ADD CONSTRAINT "ai_lessons_learned_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
