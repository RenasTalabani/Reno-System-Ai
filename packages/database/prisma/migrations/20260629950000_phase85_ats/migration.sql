-- Phase 85: Recruitment / ATS
CREATE TABLE IF NOT EXISTS "ats_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "department" VARCHAR(100),
  "location" VARCHAR(200),
  "type" VARCHAR(30) NOT NULL DEFAULT 'full_time',
  "description" TEXT,
  "requirements" TEXT,
  "salary_min" DECIMAL(18,2),
  "salary_max" DECIMAL(18,2),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "closes_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ats_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ats_jobs_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ats_jobs_tenant_id_idx" ON "ats_jobs"("tenant_id");

CREATE TABLE IF NOT EXISTS "ats_candidates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(300) NOT NULL,
  "phone" VARCHAR(30),
  "resume_url" VARCHAR(1000),
  "linkedin_url" VARCHAR(500),
  "source" VARCHAR(50),
  "tags" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ats_candidates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ats_candidates_tenant_email_key" UNIQUE ("tenant_id", "email"),
  CONSTRAINT "ats_candidates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ats_candidates_tenant_id_idx" ON "ats_candidates"("tenant_id");

CREATE TABLE IF NOT EXISTS "ats_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "candidate_id" UUID NOT NULL,
  "stage" VARCHAR(50) NOT NULL DEFAULT 'applied',
  "score" INTEGER,
  "notes" TEXT,
  "rejected_at" TIMESTAMPTZ,
  "hired_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ats_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ats_applications_job_fkey" FOREIGN KEY ("job_id") REFERENCES "ats_jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "ats_applications_candidate_fkey" FOREIGN KEY ("candidate_id") REFERENCES "ats_candidates"("id")
);
CREATE INDEX IF NOT EXISTS "ats_applications_job_idx" ON "ats_applications"("job_id");
CREATE INDEX IF NOT EXISTS "ats_applications_candidate_idx" ON "ats_applications"("candidate_id");

CREATE TABLE IF NOT EXISTS "ats_interviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "application_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "duration_mins" INTEGER NOT NULL DEFAULT 60,
  "interviewers" JSONB NOT NULL DEFAULT '[]',
  "location" VARCHAR(300),
  "meeting_link" VARCHAR(500),
  "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  "feedback" TEXT,
  "rating" INTEGER,
  CONSTRAINT "ats_interviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ats_interviews_application_fkey" FOREIGN KEY ("application_id") REFERENCES "ats_applications"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ats_interviews_application_idx" ON "ats_interviews"("application_id");