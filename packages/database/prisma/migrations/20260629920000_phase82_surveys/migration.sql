-- Phase 82: Customer Surveys & Feedback
CREATE TABLE IF NOT EXISTS "sur_surveys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "starts_at" TIMESTAMPTZ,
  "ends_at" TIMESTAMPTZ,
  "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sur_surveys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sur_surveys_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "sur_surveys_tenant_id_idx" ON "sur_surveys"("tenant_id");

CREATE TABLE IF NOT EXISTS "sur_questions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "survey_id" UUID NOT NULL,
  "text" VARCHAR(1000) NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "options" JSONB,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "sur_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sur_questions_survey_fkey" FOREIGN KEY ("survey_id") REFERENCES "sur_surveys"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "sur_questions_survey_idx" ON "sur_questions"("survey_id");

CREATE TABLE IF NOT EXISTS "sur_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "survey_id" UUID NOT NULL,
  "respondent_id" UUID,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sur_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sur_responses_survey_fkey" FOREIGN KEY ("survey_id") REFERENCES "sur_surveys"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "sur_responses_survey_idx" ON "sur_responses"("survey_id");

CREATE TABLE IF NOT EXISTS "sur_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "response_id" UUID NOT NULL,
  "question_id" UUID NOT NULL,
  "value" JSONB NOT NULL,
  CONSTRAINT "sur_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sur_answers_response_fkey" FOREIGN KEY ("response_id") REFERENCES "sur_responses"("id") ON DELETE CASCADE,
  CONSTRAINT "sur_answers_question_fkey" FOREIGN KEY ("question_id") REFERENCES "sur_questions"("id")
);
CREATE INDEX IF NOT EXISTS "sur_answers_response_idx" ON "sur_answers"("response_id");