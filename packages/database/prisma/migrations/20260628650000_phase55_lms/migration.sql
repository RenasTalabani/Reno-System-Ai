-- Phase 55: Learning Management System (LMS)

CREATE TABLE "lms_courses" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "title"         VARCHAR(300) NOT NULL,
  "slug"          VARCHAR(300) NOT NULL,
  "description"   TEXT,
  "category"      VARCHAR(100),
  "level"         VARCHAR(20) NOT NULL DEFAULT 'beginner',
  "status"        VARCHAR(20) NOT NULL DEFAULT 'draft',
  "thumbnail_url" VARCHAR(500),
  "duration_min"  INTEGER     NOT NULL DEFAULT 0,
  "is_mandatory"  BOOLEAN     NOT NULL DEFAULT false,
  "pass_score"    SMALLINT    NOT NULL DEFAULT 70,
  "created_by"    UUID,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "lms_courses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lms_courses_tenant_slug_idx" ON "lms_courses"("tenant_id","slug");
CREATE INDEX "lms_courses_tenant_status_idx" ON "lms_courses"("tenant_id","status");
ALTER TABLE "lms_courses" ADD CONSTRAINT "lms_courses_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;

CREATE TABLE "lms_lessons" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "course_id"   UUID        NOT NULL,
  "title"       VARCHAR(300) NOT NULL,
  "type"        VARCHAR(20) NOT NULL DEFAULT 'text',
  "content"     TEXT,
  "video_url"   VARCHAR(500),
  "duration_min" INTEGER    NOT NULL DEFAULT 0,
  "order_index" INTEGER     NOT NULL DEFAULT 0,
  "is_quiz"     BOOLEAN     NOT NULL DEFAULT false,
  "quiz_data"   JSONB       NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "lms_lessons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lms_lessons_course_order_idx" ON "lms_lessons"("course_id","order_index");
ALTER TABLE "lms_lessons" ADD CONSTRAINT "lms_lessons_course_fkey"
  FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE;

CREATE TABLE "lms_enrollments" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "course_id"     UUID        NOT NULL,
  "user_id"       UUID        NOT NULL,
  "status"        VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  "progress"      SMALLINT    NOT NULL DEFAULT 0,
  "score"         DECIMAL(5,2),
  "enrolled_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at"  TIMESTAMPTZ,
  "due_date"      DATE,
  CONSTRAINT "lms_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lms_enrollments_course_user_idx" ON "lms_enrollments"("course_id","user_id");
CREATE INDEX "lms_enrollments_tenant_user_idx" ON "lms_enrollments"("tenant_id","user_id");
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_tenant_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE CASCADE;
ALTER TABLE "lms_enrollments" ADD CONSTRAINT "lms_enrollments_course_fkey"
  FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE;

CREATE TABLE "lms_progress" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "lesson_id"   UUID        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "is_complete" BOOLEAN     NOT NULL DEFAULT false,
  "score"       DECIMAL(5,2),
  "attempts"    SMALLINT    NOT NULL DEFAULT 0,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "lms_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lms_progress_lesson_user_idx" ON "lms_progress"("lesson_id","user_id");
ALTER TABLE "lms_progress" ADD CONSTRAINT "lms_progress_lesson_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lms_lessons"("id") ON DELETE CASCADE;
