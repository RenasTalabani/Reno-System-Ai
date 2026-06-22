-- CreateTable
CREATE TABLE "hr_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "department_id" UUID,
    "team_id" UUID,
    "user_id" UUID,
    "manager_id" UUID,
    "employee_code" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "marital_status" VARCHAR(30),
    "nationality" VARCHAR(100),
    "national_id" VARCHAR(100),
    "passport_no" VARCHAR(100),
    "passport_expiry" DATE,
    "personal_email" VARCHAR(255),
    "work_email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" JSONB,
    "emergency_contact" JSONB,
    "hire_date" DATE NOT NULL,
    "probation_end_date" DATE,
    "confirmation_date" DATE,
    "termination_date" DATE,
    "termination_reason" TEXT,
    "employment_type" VARCHAR(50) NOT NULL DEFAULT 'full_time',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "avatar_url" VARCHAR(500),
    "bio" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "ai_insights" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_job_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "department_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "level" VARCHAR(50),
    "grade" VARCHAR(50),
    "salary_grade_min" DECIMAL(15,2),
    "salary_grade_max" DECIMAL(15,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_job_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "position_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_employee_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "working_hours" DECIMAL(4,2) NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_flexible" BOOLEAN NOT NULL DEFAULT false,
    "work_days" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "color" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_employee_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "working_hours" DECIMAL(4,2),
    "status" VARCHAR(50) NOT NULL DEFAULT 'present',
    "source" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "paid_type" VARCHAR(20) NOT NULL DEFAULT 'paid',
    "max_days_per_year" INTEGER,
    "carry_forward_days" INTEGER NOT NULL DEFAULT 0,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "requires_document" BOOLEAN NOT NULL DEFAULT false,
    "min_notice_days" INTEGER NOT NULL DEFAULT 0,
    "gender_restriction" VARCHAR(20) NOT NULL DEFAULT 'all',
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "total_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "used_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "pending_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "carried_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(6,2) NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_period" VARCHAR(20),
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "document_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payroll_grades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "min_salary" DECIMAL(15,2) NOT NULL,
    "max_salary" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_payroll_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payslips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "grade_id" UUID,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "basic_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "earnings" JSONB NOT NULL DEFAULT '[]',
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "working_days" INTEGER,
    "present_days" INTEGER,
    "absent_days" INTEGER,
    "leave_days" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "processed_by" UUID,
    "processed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500),
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "expiry_date" DATE,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL DEFAULT 'valid',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'public',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_user_id_key" ON "hr_employees"("user_id");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_idx" ON "hr_employees"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_company_id_idx" ON "hr_employees"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_department_id_idx" ON "hr_employees"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_status_idx" ON "hr_employees"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "hr_employees_tenant_id_manager_id_idx" ON "hr_employees"("tenant_id", "manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_tenant_id_company_id_employee_code_key" ON "hr_employees"("tenant_id", "company_id", "employee_code");

-- CreateIndex
CREATE INDEX "hr_job_positions_tenant_id_company_id_idx" ON "hr_job_positions"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "hr_job_positions_tenant_id_department_id_idx" ON "hr_job_positions"("tenant_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_job_positions_tenant_id_company_id_title_key" ON "hr_job_positions"("tenant_id", "company_id", "title");

-- CreateIndex
CREATE INDEX "hr_employee_positions_tenant_id_employee_id_idx" ON "hr_employee_positions"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_employee_positions_tenant_id_position_id_idx" ON "hr_employee_positions"("tenant_id", "position_id");

-- CreateIndex
CREATE INDEX "hr_shifts_tenant_id_company_id_idx" ON "hr_shifts"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_shifts_tenant_id_company_id_name_key" ON "hr_shifts"("tenant_id", "company_id", "name");

-- CreateIndex
CREATE INDEX "hr_employee_shifts_tenant_id_employee_id_idx" ON "hr_employee_shifts"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_employee_shifts_tenant_id_shift_id_idx" ON "hr_employee_shifts"("tenant_id", "shift_id");

-- CreateIndex
CREATE INDEX "hr_attendance_tenant_id_employee_id_idx" ON "hr_attendance"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_attendance_tenant_id_date_idx" ON "hr_attendance"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "hr_attendance_tenant_id_status_idx" ON "hr_attendance"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hr_attendance_tenant_id_employee_id_date_key" ON "hr_attendance"("tenant_id", "employee_id", "date");

-- CreateIndex
CREATE INDEX "hr_leave_types_tenant_id_company_id_idx" ON "hr_leave_types"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_leave_types_tenant_id_company_id_code_key" ON "hr_leave_types"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "hr_leave_balances_tenant_id_employee_id_idx" ON "hr_leave_balances"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_leave_balances_tenant_id_year_idx" ON "hr_leave_balances"("tenant_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "hr_leave_balances_tenant_id_employee_id_leave_type_id_year_key" ON "hr_leave_balances"("tenant_id", "employee_id", "leave_type_id", "year");

-- CreateIndex
CREATE INDEX "hr_leave_requests_tenant_id_employee_id_idx" ON "hr_leave_requests"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_leave_requests_tenant_id_status_idx" ON "hr_leave_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "hr_leave_requests_tenant_id_start_date_end_date_idx" ON "hr_leave_requests"("tenant_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "hr_payroll_grades_tenant_id_company_id_idx" ON "hr_payroll_grades"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_payroll_grades_tenant_id_company_id_code_key" ON "hr_payroll_grades"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "hr_payslips_tenant_id_employee_id_idx" ON "hr_payslips"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_payslips_tenant_id_month_year_idx" ON "hr_payslips"("tenant_id", "month", "year");

-- CreateIndex
CREATE INDEX "hr_payslips_tenant_id_status_idx" ON "hr_payslips"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hr_payslips_tenant_id_employee_id_month_year_key" ON "hr_payslips"("tenant_id", "employee_id", "month", "year");

-- CreateIndex
CREATE INDEX "hr_documents_tenant_id_employee_id_idx" ON "hr_documents"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_documents_tenant_id_type_idx" ON "hr_documents"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "hr_documents_tenant_id_expiry_date_idx" ON "hr_documents"("tenant_id", "expiry_date");

-- CreateIndex
CREATE INDEX "hr_holidays_tenant_id_date_idx" ON "hr_holidays"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "hr_holidays_tenant_id_company_id_idx" ON "hr_holidays"("tenant_id", "company_id");

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "core_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "hr_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_job_positions" ADD CONSTRAINT "hr_job_positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_job_positions" ADD CONSTRAINT "hr_job_positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_positions" ADD CONSTRAINT "hr_employee_positions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_positions" ADD CONSTRAINT "hr_employee_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "hr_job_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_shifts" ADD CONSTRAINT "hr_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_shifts" ADD CONSTRAINT "hr_employee_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_shifts" ADD CONSTRAINT "hr_employee_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "hr_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance" ADD CONSTRAINT "hr_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_types" ADD CONSTRAINT "hr_leave_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "hr_leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "hr_leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payroll_grades" ADD CONSTRAINT "hr_payroll_grades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payroll_grades" ADD CONSTRAINT "hr_payroll_grades_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payslips" ADD CONSTRAINT "hr_payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payslips" ADD CONSTRAINT "hr_payslips_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "hr_payroll_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_holidays" ADD CONSTRAINT "hr_holidays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
