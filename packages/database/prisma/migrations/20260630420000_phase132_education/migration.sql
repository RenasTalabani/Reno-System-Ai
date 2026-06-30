-- Phase 132: Education Administration
CREATE TABLE IF NOT EXISTS edu_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  address VARCHAR(500),
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_schools_tenant_id_idx ON edu_schools(tenant_id);

CREATE TABLE IF NOT EXISTS edu_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES edu_schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(20),
  capacity INT NOT NULL DEFAULT 30,
  teacher_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_classes_school_id_idx ON edu_classes(school_id);

CREATE TABLE IF NOT EXISTS edu_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES edu_schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_students_school_id_idx ON edu_students(school_id);

CREATE TABLE IF NOT EXISTS edu_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES edu_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES edu_students(id) ON DELETE CASCADE,
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  UNIQUE (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS edu_enrollments_class_id_idx ON edu_enrollments(class_id);
CREATE INDEX IF NOT EXISTS edu_enrollments_student_id_idx ON edu_enrollments(student_id);
