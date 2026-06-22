import { PrismaClient } from '../generated/prisma/index.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Reno System database...')

  // -------------------------------------------------------------------------
  // 1. Seed system permissions (global — no tenant_id)
  // -------------------------------------------------------------------------
  console.log('   → Seeding permissions...')

  const permissionDefs = [
    // Core — Users
    { module: 'core', resource: 'users', action: 'read', scope: 'own' },
    { module: 'core', resource: 'users', action: 'read', scope: 'department' },
    { module: 'core', resource: 'users', action: 'read', scope: 'company' },
    { module: 'core', resource: 'users', action: 'read', scope: 'all' },
    { module: 'core', resource: 'users', action: 'create', scope: 'company' },
    { module: 'core', resource: 'users', action: 'update', scope: 'own' },
    { module: 'core', resource: 'users', action: 'update', scope: 'company' },
    { module: 'core', resource: 'users', action: 'delete', scope: 'company' },
    // Core — Roles
    { module: 'core', resource: 'roles', action: 'read', scope: 'company' },
    { module: 'core', resource: 'roles', action: 'manage', scope: 'company' },
    // Core — Settings
    { module: 'core', resource: 'settings', action: 'read', scope: 'company' },
    { module: 'core', resource: 'settings', action: 'manage', scope: 'company' },
    { module: 'core', resource: 'settings', action: 'manage', scope: 'all' },
    // Core — Audit Logs
    { module: 'core', resource: 'audit_logs', action: 'read', scope: 'company' },
    { module: 'core', resource: 'audit_logs', action: 'read', scope: 'all' },
    // Core — Branding
    { module: 'core', resource: 'branding', action: 'manage', scope: 'company' },
    // Core — Companies / Branches / Departments
    { module: 'core', resource: 'companies', action: 'manage', scope: 'all' },
    { module: 'core', resource: 'branches', action: 'manage', scope: 'company' },
    { module: 'core', resource: 'departments', action: 'manage', scope: 'company' },
    { module: 'core', resource: 'teams', action: 'manage', scope: 'company' },
    // HR — Employees
    { module: 'hr', resource: 'employees', action: 'read', scope: 'own' },
    { module: 'hr', resource: 'employees', action: 'read', scope: 'department' },
    { module: 'hr', resource: 'employees', action: 'read', scope: 'all' },
    { module: 'hr', resource: 'employees', action: 'create', scope: 'company' },
    { module: 'hr', resource: 'employees', action: 'update', scope: 'company' },
    { module: 'hr', resource: 'employees', action: 'delete', scope: 'company' },
    // HR — Attendance
    { module: 'hr', resource: 'attendance', action: 'read', scope: 'own' },
    { module: 'hr', resource: 'attendance', action: 'read', scope: 'all' },
    { module: 'hr', resource: 'attendance', action: 'manage', scope: 'company' },
    // HR — Leave
    { module: 'hr', resource: 'leave', action: 'read', scope: 'own' },
    { module: 'hr', resource: 'leave', action: 'request', scope: 'own' },
    { module: 'hr', resource: 'leave', action: 'approve', scope: 'company' },
    { module: 'hr', resource: 'leave', action: 'manage', scope: 'company' },
    // HR — Payroll
    { module: 'hr', resource: 'payroll', action: 'read', scope: 'own' },
    { module: 'hr', resource: 'payroll', action: 'manage', scope: 'company' },
    // HR — Documents
    { module: 'hr', resource: 'documents', action: 'read', scope: 'own' },
    { module: 'hr', resource: 'documents', action: 'manage', scope: 'company' },
    // HR — Settings (positions, shifts, leave types, holidays)
    { module: 'hr', resource: 'settings', action: 'read', scope: 'company' },
    { module: 'hr', resource: 'settings', action: 'manage', scope: 'company' },
    // Project Management
    { module: 'pm', resource: 'projects', action: 'read', scope: 'own' },
    { module: 'pm', resource: 'projects', action: 'read', scope: 'all' },
    { module: 'pm', resource: 'projects', action: 'create', scope: 'company' },
    { module: 'pm', resource: 'projects', action: 'update', scope: 'own' },
    { module: 'pm', resource: 'projects', action: 'delete', scope: 'own' },
    { module: 'pm', resource: 'tasks', action: 'read', scope: 'own' },
    { module: 'pm', resource: 'tasks', action: 'read', scope: 'all' },
    { module: 'pm', resource: 'tasks', action: 'create', scope: 'company' },
    { module: 'pm', resource: 'tasks', action: 'update', scope: 'own' },
    { module: 'pm', resource: 'tasks', action: 'manage', scope: 'company' },
    { module: 'pm', resource: 'time_logs', action: 'read', scope: 'own' },
    { module: 'pm', resource: 'time_logs', action: 'create', scope: 'own' },
    { module: 'pm', resource: 'time_logs', action: 'manage', scope: 'company' },
    { module: 'pm', resource: 'resources', action: 'read', scope: 'company' },
    { module: 'pm', resource: 'resources', action: 'manage', scope: 'company' },
    // CRM
    { module: 'crm', resource: 'contacts', action: 'read', scope: 'own' },
    { module: 'crm', resource: 'contacts', action: 'read', scope: 'all' },
    { module: 'crm', resource: 'contacts', action: 'create', scope: 'company' },
    { module: 'crm', resource: 'contacts', action: 'update', scope: 'own' },
    { module: 'crm', resource: 'contacts', action: 'manage', scope: 'company' },
    { module: 'crm', resource: 'companies', action: 'read', scope: 'all' },
    { module: 'crm', resource: 'companies', action: 'manage', scope: 'company' },
    { module: 'crm', resource: 'opportunities', action: 'read', scope: 'own' },
    { module: 'crm', resource: 'opportunities', action: 'read', scope: 'all' },
    { module: 'crm', resource: 'opportunities', action: 'create', scope: 'company' },
    { module: 'crm', resource: 'opportunities', action: 'update', scope: 'own' },
    { module: 'crm', resource: 'opportunities', action: 'manage', scope: 'company' },
    { module: 'crm', resource: 'activities', action: 'read', scope: 'own' },
    { module: 'crm', resource: 'activities', action: 'manage', scope: 'company' },
    { module: 'crm', resource: 'contracts', action: 'read', scope: 'company' },
    { module: 'crm', resource: 'contracts', action: 'manage', scope: 'company' },
    { module: 'crm', resource: 'pipeline', action: 'manage', scope: 'company' },
    // Finance
    { module: 'finance', resource: 'invoices', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'invoices', action: 'create', scope: 'company' },
    { module: 'finance', resource: 'invoices', action: 'approve', scope: 'company' },
    { module: 'finance', resource: 'reports', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'accounts', action: 'manage', scope: 'company' },
  ]

  for (const perm of permissionDefs) {
    await prisma.corePermission.upsert({
      where: {
        module_resource_action_scope: {
          module: perm.module,
          resource: perm.resource,
          action: perm.action,
          scope: perm.scope,
        },
      },
      update: {},
      create: perm,
    })
  }

  // -------------------------------------------------------------------------
  // 2. Create demo tenant
  // -------------------------------------------------------------------------
  console.log('   → Creating demo tenant...')

  const tenantSlug = process.env['SEED_TENANT_SLUG'] ?? 'demo'
  const tenantName = process.env['SEED_TENANT_NAME'] ?? 'Reno Demo'
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@demo.com'
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'Demo@123456'

  const tenant = await prisma.coreTenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: tenantName,
      slug: tenantSlug,
      plan: 'enterprise',
      status: 'active',
      settings: {},
    },
  })

  // -------------------------------------------------------------------------
  // 3. Create demo company
  // -------------------------------------------------------------------------
  let company = await prisma.coreCompany.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  })

  if (!company) {
    company = await prisma.coreCompany.create({
      data: {
        tenantId: tenant.id,
        name: tenantName,
        currency: 'USD',
        timezone: 'America/New_York',
      },
    })
  }

  // -------------------------------------------------------------------------
  // 4. Create demo branch
  // -------------------------------------------------------------------------
  let branch = await prisma.coreBranch.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  })

  if (!branch) {
    branch = await prisma.coreBranch.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        name: 'Headquarters',
        branchType: 'head_office',
      },
    })
  }

  // -------------------------------------------------------------------------
  // 5. Create departments
  // -------------------------------------------------------------------------
  const deptNames = ['Management', 'Human Resources', 'Finance', 'Technology', 'Operations']
  const departments: Record<string, { id: string }> = {}

  for (const deptName of deptNames) {
    const existing = await prisma.coreDepartment.findFirst({
      where: { tenantId: tenant.id, name: deptName, deletedAt: null },
    })

    const dept = existing ?? await prisma.coreDepartment.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        branchId: branch.id,
        name: deptName,
      },
    })

    departments[deptName] = dept
  }

  // -------------------------------------------------------------------------
  // 6. Create system roles for this tenant
  // -------------------------------------------------------------------------
  console.log('   → Creating system roles...')

  const roleDefs = [
    { slug: 'tenant_owner', name: 'Tenant Owner', description: 'Full access to everything in this tenant', isSystem: true, scope: 'tenant', color: '#ef4444' },
    { slug: 'company_admin', name: 'Company Admin', description: 'Full administrative access within a company', isSystem: true, scope: 'company', color: '#f97316' },
    { slug: 'branch_manager', name: 'Branch Manager', description: 'Management access within a branch', isSystem: true, scope: 'branch', color: '#eab308' },
    { slug: 'department_head', name: 'Department Head', description: 'Access to manage their department', isSystem: true, scope: 'department', color: '#22c55e' },
    { slug: 'employee', name: 'Employee', description: 'Self-service access only', isSystem: true, scope: 'own', color: '#6366f1' },
    { slug: 'hr_manager', name: 'HR Manager', description: 'Full HR module access', isSystem: true, scope: 'company', color: '#8b5cf6' },
    { slug: 'finance_manager', name: 'Finance Manager', description: 'Full Finance module access', isSystem: true, scope: 'company', color: '#06b6d4' },
    { slug: 'it_admin', name: 'IT Admin', description: 'User management and system settings', isSystem: true, scope: 'company', color: '#64748b' },
    { slug: 'viewer', name: 'Read Only', description: 'Read-only access to allowed modules', isSystem: true, scope: 'company', color: '#94a3b8' },
  ]

  const roles: Record<string, { id: string }> = {}

  for (const roleDef of roleDefs) {
    const existing = await prisma.coreRole.findFirst({
      where: { tenantId: tenant.id, slug: roleDef.slug, deletedAt: null },
    })

    const role = existing ?? await prisma.coreRole.create({
      data: { tenantId: tenant.id, ...roleDef },
    })

    roles[roleDef.slug] = role
  }

  // -------------------------------------------------------------------------
  // 7. Create admin user
  // -------------------------------------------------------------------------
  console.log('   → Creating admin user...')

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  let adminUser = await prisma.coreUser.findFirst({
    where: { tenantId: tenant.id, email: adminEmail, deletedAt: null },
  })

  if (!adminUser) {
    adminUser = await prisma.coreUser.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        passwordHash,
        emailVerified: true,
        status: 'active',
        locale: 'en',
      },
    })

    await prisma.coreUserProfile.create({
      data: {
        tenantId: tenant.id,
        userId: adminUser.id,
        firstName: 'System',
        lastName: 'Admin',
        displayName: 'System Admin',
      },
    })

    await prisma.coreUserMembership.create({
      data: {
        tenantId: tenant.id,
        userId: adminUser.id,
        companyId: company.id,
        branchId: branch.id,
        departmentId: departments['Management']?.id,
        jobTitle: 'System Administrator',
        isPrimary: true,
      },
    })

    // Assign tenant_owner role
    if (roles['tenant_owner']) {
      await prisma.coreUserRole.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          roleId: roles['tenant_owner'].id,
        },
      })
    }
  }

  // -------------------------------------------------------------------------
  // 8. Create branding
  // -------------------------------------------------------------------------
  await prisma.sysBranding.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      appName: tenantName,
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor: '#ec4899',
      fontFamily: 'Inter',
      theme: 'light',
    },
  })

  // -------------------------------------------------------------------------
  // 9. Enable all modules for demo tenant
  // -------------------------------------------------------------------------
  const moduleList = ['core', 'hr', 'pm', 'crm', 'projects', 'sales', 'inventory', 'procurement', 'finance', 'documents', 'communication', 'ai', 'bi']

  for (const module of moduleList) {
    await prisma.sysFeatureFlag.upsert({
      where: { tenantId_module_feature: { tenantId: tenant.id, module, feature: 'enabled' } },
      update: {},
      create: { tenantId: tenant.id, module, feature: 'enabled', enabled: true },
    })
  }

  // -------------------------------------------------------------------------
  // 10. Set default AI monthly token quota (1M tokens for demo tenant)
  // -------------------------------------------------------------------------
  await prisma.coreTenant.update({
    where: { id: tenant.id },
    data: { aiMonthlyTokenQuota: 1_000_000 },
  })

  // -------------------------------------------------------------------------
  // 11. Seed system UI translations (English baseline)
  // -------------------------------------------------------------------------
  const uiTranslations = [
    // Core navigation
    { namespace: 'core.nav', key: 'dashboard', locale: 'en', value: 'Dashboard' },
    { namespace: 'core.nav', key: 'users', locale: 'en', value: 'Users' },
    { namespace: 'core.nav', key: 'organization', locale: 'en', value: 'Organization' },
    { namespace: 'core.nav', key: 'roles', locale: 'en', value: 'Roles & Permissions' },
    { namespace: 'core.nav', key: 'settings', locale: 'en', value: 'Settings' },
    { namespace: 'core.nav', key: 'audit_logs', locale: 'en', value: 'Audit Logs' },
    { namespace: 'core.nav', key: 'notifications', locale: 'en', value: 'Notifications' },
    // Common actions
    { namespace: 'core.actions', key: 'save', locale: 'en', value: 'Save' },
    { namespace: 'core.actions', key: 'cancel', locale: 'en', value: 'Cancel' },
    { namespace: 'core.actions', key: 'delete', locale: 'en', value: 'Delete' },
    { namespace: 'core.actions', key: 'edit', locale: 'en', value: 'Edit' },
    { namespace: 'core.actions', key: 'create', locale: 'en', value: 'Create' },
    { namespace: 'core.actions', key: 'search', locale: 'en', value: 'Search' },
    { namespace: 'core.actions', key: 'export', locale: 'en', value: 'Export' },
    { namespace: 'core.actions', key: 'import', locale: 'en', value: 'Import' },
    { namespace: 'core.actions', key: 'confirm', locale: 'en', value: 'Confirm' },
    { namespace: 'core.actions', key: 'back', locale: 'en', value: 'Back' },
    // Common labels
    { namespace: 'core.labels', key: 'name', locale: 'en', value: 'Name' },
    { namespace: 'core.labels', key: 'email', locale: 'en', value: 'Email' },
    { namespace: 'core.labels', key: 'status', locale: 'en', value: 'Status' },
    { namespace: 'core.labels', key: 'created_at', locale: 'en', value: 'Created' },
    { namespace: 'core.labels', key: 'updated_at', locale: 'en', value: 'Last Updated' },
    { namespace: 'core.labels', key: 'active', locale: 'en', value: 'Active' },
    { namespace: 'core.labels', key: 'inactive', locale: 'en', value: 'Inactive' },
    { namespace: 'core.labels', key: 'yes', locale: 'en', value: 'Yes' },
    { namespace: 'core.labels', key: 'no', locale: 'en', value: 'No' },
    // Auth
    { namespace: 'core.auth', key: 'login', locale: 'en', value: 'Sign In' },
    { namespace: 'core.auth', key: 'logout', locale: 'en', value: 'Sign Out' },
    { namespace: 'core.auth', key: 'password', locale: 'en', value: 'Password' },
    { namespace: 'core.auth', key: 'forgot_password', locale: 'en', value: 'Forgot Password?' },
    { namespace: 'core.auth', key: 'mfa_title', locale: 'en', value: 'Two-Factor Authentication' },
    { namespace: 'core.auth', key: 'mfa_prompt', locale: 'en', value: 'Enter your 6-digit code' },
    // Errors
    { namespace: 'core.errors', key: 'required', locale: 'en', value: 'This field is required' },
    { namespace: 'core.errors', key: 'invalid_email', locale: 'en', value: 'Please enter a valid email address' },
    { namespace: 'core.errors', key: 'unauthorized', locale: 'en', value: 'You are not authorized to perform this action' },
    { namespace: 'core.errors', key: 'not_found', locale: 'en', value: 'Resource not found' },
    { namespace: 'core.errors', key: 'server_error', locale: 'en', value: 'An unexpected error occurred. Please try again.' },
    // Arabic baseline (placeholder — to be AI-translated in Phase 10)
    { namespace: 'core.nav', key: 'dashboard', locale: 'ar', value: 'لوحة التحكم', source: 'manual' },
    { namespace: 'core.nav', key: 'users', locale: 'ar', value: 'المستخدمون', source: 'manual' },
    { namespace: 'core.nav', key: 'settings', locale: 'ar', value: 'الإعدادات', source: 'manual' },
    { namespace: 'core.actions', key: 'save', locale: 'ar', value: 'حفظ', source: 'manual' },
    { namespace: 'core.actions', key: 'cancel', locale: 'ar', value: 'إلغاء', source: 'manual' },
    { namespace: 'core.auth', key: 'login', locale: 'ar', value: 'تسجيل الدخول', source: 'manual' },
  ]

  for (const t of uiTranslations) {
    const exists = await prisma.sysUiTranslation.findFirst({
      where: { tenantId: null, namespace: t.namespace, key: t.key, locale: t.locale },
    })
    if (!exists) {
      await prisma.sysUiTranslation.create({
        data: { tenantId: null, namespace: t.namespace, key: t.key, locale: t.locale, value: t.value, source: (t as any).source ?? 'system' },
      })
    }
  }
  console.log(`   → Seeded ${uiTranslations.length} UI translations (en + ar baseline)`)

  // -------------------------------------------------------------------------
  // 12. Seed HR default data
  // -------------------------------------------------------------------------
  console.log('   → Seeding HR default data...')

  // Default leave types
  const leaveTypeDefs = [
    { name: 'Annual Leave', code: 'ANNUAL', paidType: 'paid', maxDaysPerYear: 21, carryForwardDays: 5, requiresApproval: true, requiresDocument: false, minNoticeDays: 3, genderRestriction: 'all', color: '#22c55e' },
    { name: 'Sick Leave', code: 'SICK', paidType: 'paid', maxDaysPerYear: 14, carryForwardDays: 0, requiresApproval: true, requiresDocument: true, minNoticeDays: 0, genderRestriction: 'all', color: '#ef4444' },
    { name: 'Maternity Leave', code: 'MATERNITY', paidType: 'paid', maxDaysPerYear: 90, carryForwardDays: 0, requiresApproval: true, requiresDocument: true, minNoticeDays: 30, genderRestriction: 'female', color: '#ec4899' },
    { name: 'Emergency Leave', code: 'EMERGENCY', paidType: 'paid', maxDaysPerYear: 3, carryForwardDays: 0, requiresApproval: false, requiresDocument: false, minNoticeDays: 0, genderRestriction: 'all', color: '#f97316' },
    { name: 'Unpaid Leave', code: 'UNPAID', paidType: 'unpaid', maxDaysPerYear: 30, carryForwardDays: 0, requiresApproval: true, requiresDocument: false, minNoticeDays: 7, genderRestriction: 'all', color: '#64748b' },
  ]

  for (const lt of leaveTypeDefs) {
    const existing = await prisma.hrLeaveType.findFirst({
      where: { tenantId: tenant.id, code: lt.code, deletedAt: null },
    })
    if (!existing) {
      await prisma.hrLeaveType.create({
        data: { tenantId: tenant.id, companyId: company.id, ...lt },
      })
    }
  }

  // Default shifts
  const shiftDefs = [
    { name: 'Morning Shift', code: 'MORNING', startTime: '08:00', endTime: '16:00', breakDuration: 60, workDays: ['mon', 'tue', 'wed', 'thu', 'fri'], overnightShift: false, color: '#6366f1' },
    { name: 'Evening Shift', code: 'EVENING', startTime: '16:00', endTime: '00:00', breakDuration: 60, workDays: ['mon', 'tue', 'wed', 'thu', 'fri'], overnightShift: false, color: '#8b5cf6' },
    { name: 'Night Shift', code: 'NIGHT', startTime: '00:00', endTime: '08:00', breakDuration: 60, workDays: ['mon', 'tue', 'wed', 'thu', 'fri'], overnightShift: true, color: '#1e293b' },
  ]

  for (const s of shiftDefs) {
    const existing = await prisma.hrShift.findFirst({
      where: { tenantId: tenant.id, code: s.code, deletedAt: null },
    })
    if (!existing) {
      await prisma.hrShift.create({
        data: { tenantId: tenant.id, companyId: company.id, ...s },
      })
    }
  }

  console.log('   → Seeded 5 leave types and 3 default shifts')

  // -------------------------------------------------------------------------
  // 14. Create sample team
  // -------------------------------------------------------------------------
  const existingTeam = await prisma.coreTeam.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  })

  if (!existingTeam) {
    await prisma.coreTeam.create({
      data: {
        tenantId: tenant.id,
        departmentId: departments['Technology']?.id,
        name: 'Core Development Team',
        description: 'Main development team',
        leadId: adminUser.id,
      },
    })
  }

  // -------------------------------------------------------------------------
  // 15. Seed CRM default pipeline
  // -------------------------------------------------------------------------
  console.log('   → Seeding CRM default pipeline...')

  const existingPipeline = await prisma.crmPipeline.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  })

  if (!existingPipeline) {
    const pipeline = await prisma.crmPipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        currency: 'USD',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    const stageDefs = [
      { name: 'New Lead', position: 0, probability: 10, color: '#94a3b8', isWon: false, isLost: false },
      { name: 'Qualified', position: 1, probability: 25, color: '#6366f1', isWon: false, isLost: false },
      { name: 'Proposal Sent', position: 2, probability: 50, color: '#f59e0b', isWon: false, isLost: false },
      { name: 'Negotiation', position: 3, probability: 75, color: '#f97316', isWon: false, isLost: false },
      { name: 'Won', position: 4, probability: 100, color: '#22c55e', isWon: true, isLost: false },
      { name: 'Lost', position: 5, probability: 0, color: '#ef4444', isWon: false, isLost: true },
    ]

    for (const s of stageDefs) {
      await prisma.crmPipelineStage.create({
        data: {
          tenantId: tenant.id,
          pipelineId: pipeline.id,
          ...s,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
    }

    console.log('   → Seeded 1 CRM pipeline with 6 stages')
  }

  console.log('')
  console.log('✅ Seed complete!')
  console.log('')
  console.log('   Tenant:', tenantName, `(slug: ${tenantSlug})`)
  console.log('   Admin:', adminEmail)
  console.log('   Password:', adminPassword)
  console.log('')
  console.log('   Access the app at: http://localhost:3000')
  console.log('   API:               http://localhost:4000')
  console.log('   DB Studio:         http://localhost:5555')
  console.log('   MailHog:           http://localhost:8025')
  console.log('   MinIO Console:     http://localhost:9001')
  console.log('   Adminer:           http://localhost:8080')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
