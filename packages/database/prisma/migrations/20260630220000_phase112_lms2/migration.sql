-- Phase 112: LMS 2.0
CREATE TABLE IF NOT EXISTS lms2_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  level VARCHAR(20) NOT NULL DEFAULT 'beginner',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  author_id UUID NOT NULL,
  thumbnail_url VARCHAR(500),
  duration_mins INT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms2_courses_tenant ON lms2_courses(tenant_id);

CREATE TABLE IF NOT EXISTS lms2_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES lms2_courses(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL DEFAULT 'video',
  content_url VARCHAR(500),
  duration_mins INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms2_modules_course ON lms2_modules(course_id);

CREATE TABLE IF NOT EXISTS lms2_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES lms2_courses(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  score DECIMAL(5,2),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lms2_enrollments_course ON lms2_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lms2_enrollments_learner ON lms2_enrollments(learner_id);
