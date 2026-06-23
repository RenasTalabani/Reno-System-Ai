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
    // Sales
    { module: 'sales', resource: 'products', action: 'read', scope: 'company' },
    { module: 'sales', resource: 'products', action: 'manage', scope: 'company' },
    { module: 'sales', resource: 'quotations', action: 'read', scope: 'own' },
    { module: 'sales', resource: 'quotations', action: 'read', scope: 'all' },
    { module: 'sales', resource: 'quotations', action: 'create', scope: 'company' },
    { module: 'sales', resource: 'quotations', action: 'update', scope: 'own' },
    { module: 'sales', resource: 'quotations', action: 'manage', scope: 'company' },
    { module: 'sales', resource: 'orders', action: 'read', scope: 'own' },
    { module: 'sales', resource: 'orders', action: 'read', scope: 'all' },
    { module: 'sales', resource: 'orders', action: 'create', scope: 'company' },
    { module: 'sales', resource: 'orders', action: 'manage', scope: 'company' },
    { module: 'sales', resource: 'invoices', action: 'read', scope: 'company' },
    { module: 'sales', resource: 'invoices', action: 'manage', scope: 'company' },
    { module: 'sales', resource: 'payments', action: 'read', scope: 'company' },
    { module: 'sales', resource: 'payments', action: 'manage', scope: 'company' },
    { module: 'sales', resource: 'subscriptions', action: 'read', scope: 'company' },
    { module: 'sales', resource: 'subscriptions', action: 'manage', scope: 'company' },
    { module: 'sales', resource: 'settings', action: 'manage', scope: 'company' },
    // Finance
    { module: 'finance', resource: 'accounts', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'accounts', action: 'manage', scope: 'company' },
    { module: 'finance', resource: 'journals', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'journals', action: 'create', scope: 'company' },
    { module: 'finance', resource: 'journals', action: 'post', scope: 'company' },
    { module: 'finance', resource: 'journals', action: 'void', scope: 'company' },
    { module: 'finance', resource: 'vendors', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'vendors', action: 'manage', scope: 'company' },
    { module: 'finance', resource: 'vendor_bills', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'vendor_bills', action: 'create', scope: 'company' },
    { module: 'finance', resource: 'vendor_bills', action: 'post', scope: 'company' },
    { module: 'finance', resource: 'vendor_bills', action: 'manage', scope: 'company' },
    { module: 'finance', resource: 'bank_accounts', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'bank_accounts', action: 'manage', scope: 'company' },
    { module: 'finance', resource: 'budgets', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'budgets', action: 'manage', scope: 'company' },
    { module: 'finance', resource: 'reports', action: 'read', scope: 'company' },
    { module: 'finance', resource: 'fiscal_years', action: 'manage', scope: 'company' },
    { module: 'finance', resource: 'cost_centers', action: 'manage', scope: 'company' },
    // Inventory
    { module: 'inventory', resource: 'products', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'products', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'categories', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'units', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'warehouses', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'warehouses', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'movements', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'stock', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'stock', action: 'adjust', scope: 'company' },
    { module: 'inventory', resource: 'receipts', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'receipts', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'transfers', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'transfers', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'adjustments', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'adjustments', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'reorder_rules', action: 'read', scope: 'company' },
    { module: 'inventory', resource: 'reorder_rules', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'lots', action: 'manage', scope: 'company' },
    { module: 'inventory', resource: 'serials', action: 'manage', scope: 'company' },
    // Procurement
    { module: 'procurement', resource: 'suppliers', action: 'read', scope: 'company' },
    { module: 'procurement', resource: 'suppliers', action: 'manage', scope: 'company' },
    { module: 'procurement', resource: 'supplier_categories', action: 'manage', scope: 'company' },
    { module: 'procurement', resource: 'requisitions', action: 'read', scope: 'own' },
    { module: 'procurement', resource: 'requisitions', action: 'read', scope: 'company' },
    { module: 'procurement', resource: 'requisitions', action: 'create', scope: 'company' },
    { module: 'procurement', resource: 'requisitions', action: 'approve', scope: 'company' },
    { module: 'procurement', resource: 'rfqs', action: 'read', scope: 'company' },
    { module: 'procurement', resource: 'rfqs', action: 'manage', scope: 'company' },
    { module: 'procurement', resource: 'quotations', action: 'read', scope: 'company' },
    { module: 'procurement', resource: 'quotations', action: 'manage', scope: 'company' },
    { module: 'procurement', resource: 'orders', action: 'read', scope: 'company' },
    { module: 'procurement', resource: 'orders', action: 'create', scope: 'company' },
    { module: 'procurement', resource: 'orders', action: 'approve', scope: 'company' },
    { module: 'procurement', resource: 'orders', action: 'receive', scope: 'company' },
    { module: 'procurement', resource: 'orders', action: 'manage', scope: 'company' },
    { module: 'procurement', resource: 'evaluations', action: 'read', scope: 'company' },
    { module: 'procurement', resource: 'evaluations', action: 'manage', scope: 'company' },
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

  // -------------------------------------------------------------------------
  // 16. Seed Sales default data
  // -------------------------------------------------------------------------
  console.log('   → Seeding Sales defaults...')

  const existingCurrency = await prisma.salesCurrency.findFirst({ where: { tenantId: tenant.id, code: 'USD' } })
  if (!existingCurrency) {
    await prisma.salesCurrency.create({
      data: {
        tenantId: tenant.id, code: 'USD', name: 'US Dollar', symbol: '$',
        exchangeRate: 1, isBase: true, decimalPlaces: 2,
        createdBy: adminUser.id, updatedBy: adminUser.id,
      },
    })
    console.log('   → Seeded base currency: USD')
  }

  const existingTax = await prisma.salesTax.findFirst({ where: { tenantId: tenant.id } })
  if (!existingTax) {
    await prisma.salesTax.create({
      data: {
        tenantId: tenant.id, name: 'No Tax', code: 'NOTAX',
        rate: 0, taxType: 'percentage', isDefault: true, scope: 'global',
        createdBy: adminUser.id, updatedBy: adminUser.id,
      },
    })
    await prisma.salesTax.create({
      data: {
        tenantId: tenant.id, name: 'VAT 15%', code: 'VAT15',
        rate: 15, taxType: 'percentage', isDefault: false, scope: 'global',
        createdBy: adminUser.id, updatedBy: adminUser.id,
      },
    })
    console.log('   → Seeded 2 default taxes')
  }

  const existingPriceList = await prisma.salesPriceList.findFirst({ where: { tenantId: tenant.id } })
  if (!existingPriceList) {
    await prisma.salesPriceList.create({
      data: {
        tenantId: tenant.id, name: 'Standard Price List', currency: 'USD',
        discount: 0, isDefault: true,
        createdBy: adminUser.id, updatedBy: adminUser.id,
      },
    })
    console.log('   → Seeded default price list')
  }

  const existingPaymentMethod = await prisma.salesPaymentMethod.findFirst({ where: { tenantId: tenant.id } })
  if (!existingPaymentMethod) {
    const paymentMethods = [
      { name: 'Bank Transfer', methodType: 'bank_transfer', isDefault: true, sortOrder: 0 },
      { name: 'Cash', methodType: 'cash', isDefault: false, sortOrder: 1 },
      { name: 'Credit Card', methodType: 'credit_card', isDefault: false, sortOrder: 2 },
    ]
    for (const m of paymentMethods) {
      await prisma.salesPaymentMethod.create({
        data: { tenantId: tenant.id, ...m, config: {}, createdBy: adminUser.id, updatedBy: adminUser.id },
      })
    }
    console.log('   → Seeded 3 payment methods')
  }

  // -------------------------------------------------------------------------
  // 17. Seed Finance — Default Chart of Accounts (IFRS-ready)
  // -------------------------------------------------------------------------
  console.log('   → Seeding Finance chart of accounts...')

  const existingAccounts = await prisma.finAccount.count({ where: { tenantId: tenant.id } })
  if (!existingAccounts) {
    // Root group accounts
    const coa = [
      // Assets (1xxx)
      { code: '1000', name: 'Assets', type: 'asset', category: 'current_asset', normalBalance: 'debit', isDetail: false, isSystem: true, level: 1 },
      { code: '1100', name: 'Current Assets', type: 'asset', category: 'current_asset', normalBalance: 'debit', isDetail: false, isSystem: true, level: 2, parentCode: '1000' },
      { code: '1110', name: 'Cash and Cash Equivalents', type: 'asset', category: 'current_asset', normalBalance: 'debit', isDetail: true, isSystem: true, isBankAccount: true, level: 3, parentCode: '1100' },
      { code: '1120', name: 'Accounts Receivable', type: 'asset', category: 'current_asset', normalBalance: 'debit', isDetail: true, isSystem: true, level: 3, parentCode: '1100' },
      { code: '1130', name: 'Prepaid Expenses', type: 'asset', category: 'current_asset', normalBalance: 'debit', isDetail: true, isSystem: false, level: 3, parentCode: '1100' },
      { code: '1140', name: 'Inventory', type: 'asset', category: 'current_asset', normalBalance: 'debit', isDetail: true, isSystem: false, level: 3, parentCode: '1100' },
      { code: '1200', name: 'Non-Current Assets', type: 'asset', category: 'non_current_asset', normalBalance: 'debit', isDetail: false, isSystem: true, level: 2, parentCode: '1000' },
      { code: '1210', name: 'Property, Plant & Equipment', type: 'asset', category: 'non_current_asset', normalBalance: 'debit', isDetail: true, isSystem: false, level: 3, parentCode: '1200' },
      { code: '1220', name: 'Accumulated Depreciation', type: 'asset', category: 'non_current_asset', normalBalance: 'credit', isDetail: true, isSystem: false, level: 3, parentCode: '1200' },
      { code: '1230', name: 'Intangible Assets', type: 'asset', category: 'non_current_asset', normalBalance: 'debit', isDetail: true, isSystem: false, level: 3, parentCode: '1200' },
      // Liabilities (2xxx)
      { code: '2000', name: 'Liabilities', type: 'liability', category: 'current_liability', normalBalance: 'credit', isDetail: false, isSystem: true, level: 1 },
      { code: '2100', name: 'Current Liabilities', type: 'liability', category: 'current_liability', normalBalance: 'credit', isDetail: false, isSystem: true, level: 2, parentCode: '2000' },
      { code: '2110', name: 'Accounts Payable', type: 'liability', category: 'current_liability', normalBalance: 'credit', isDetail: true, isSystem: true, level: 3, parentCode: '2100' },
      { code: '2120', name: 'Accrued Expenses', type: 'liability', category: 'current_liability', normalBalance: 'credit', isDetail: true, isSystem: false, level: 3, parentCode: '2100' },
      { code: '2130', name: 'Taxes Payable', type: 'liability', category: 'current_liability', normalBalance: 'credit', isDetail: true, isSystem: false, level: 3, parentCode: '2100' },
      { code: '2140', name: 'Salaries Payable', type: 'liability', category: 'current_liability', normalBalance: 'credit', isDetail: true, isSystem: false, level: 3, parentCode: '2100' },
      { code: '2200', name: 'Non-Current Liabilities', type: 'liability', category: 'non_current_liability', normalBalance: 'credit', isDetail: false, isSystem: false, level: 2, parentCode: '2000' },
      { code: '2210', name: 'Long-Term Loans', type: 'liability', category: 'non_current_liability', normalBalance: 'credit', isDetail: true, isSystem: false, level: 3, parentCode: '2200' },
      // Equity (3xxx)
      { code: '3000', name: 'Equity', type: 'equity', category: 'equity', normalBalance: 'credit', isDetail: false, isSystem: true, level: 1 },
      { code: '3100', name: 'Share Capital', type: 'equity', category: 'equity', normalBalance: 'credit', isDetail: true, isSystem: true, level: 2, parentCode: '3000' },
      { code: '3200', name: 'Retained Earnings', type: 'equity', category: 'equity', normalBalance: 'credit', isDetail: true, isSystem: true, level: 2, parentCode: '3000' },
      { code: '3300', name: 'Current Year Earnings', type: 'equity', category: 'equity', normalBalance: 'credit', isDetail: true, isSystem: true, level: 2, parentCode: '3000' },
      // Revenue (4xxx)
      { code: '4000', name: 'Revenue', type: 'revenue', category: 'revenue', normalBalance: 'credit', isDetail: false, isSystem: true, level: 1 },
      { code: '4100', name: 'Sales Revenue', type: 'revenue', category: 'revenue', normalBalance: 'credit', isDetail: true, isSystem: true, level: 2, parentCode: '4000' },
      { code: '4200', name: 'Service Revenue', type: 'revenue', category: 'revenue', normalBalance: 'credit', isDetail: true, isSystem: false, level: 2, parentCode: '4000' },
      { code: '4300', name: 'Other Income', type: 'revenue', category: 'other_income', normalBalance: 'credit', isDetail: true, isSystem: false, level: 2, parentCode: '4000' },
      // COGS (5xxx)
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_goods_sold', normalBalance: 'debit', isDetail: false, isSystem: true, level: 1 },
      { code: '5100', name: 'Direct Materials', type: 'expense', category: 'cost_of_goods_sold', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '5000' },
      { code: '5200', name: 'Direct Labor', type: 'expense', category: 'cost_of_goods_sold', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '5000' },
      // Operating Expenses (6xxx)
      { code: '6000', name: 'Operating Expenses', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: false, isSystem: true, level: 1 },
      { code: '6100', name: 'Salaries & Wages', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: true, level: 2, parentCode: '6000' },
      { code: '6200', name: 'Rent Expense', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '6000' },
      { code: '6300', name: 'Utilities Expense', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '6000' },
      { code: '6400', name: 'Marketing & Advertising', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '6000' },
      { code: '6500', name: 'Depreciation Expense', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '6000' },
      { code: '6600', name: 'General & Administrative', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '6000' },
      { code: '6700', name: 'Tax Expense', type: 'expense', category: 'operating_expense', normalBalance: 'debit', isDetail: true, isSystem: false, level: 2, parentCode: '6000' },
    ]

    // First pass: create root accounts
    const accountMap = new Map<string, string>()
    for (const acc of coa.filter(a => !a.parentCode)) {
      const created = await prisma.finAccount.create({
        data: {
          tenantId: tenant.id, code: acc.code, name: acc.name, type: acc.type,
          category: acc.category, normalBalance: acc.normalBalance,
          isDetail: acc.isDetail, isSystem: acc.isSystem,
          isBankAccount: (acc as any).isBankAccount ?? false,
          level: acc.level, createdBy: adminUser.id, updatedBy: adminUser.id,
        },
      })
      accountMap.set(acc.code, created.id)
    }
    // Second pass: child accounts
    for (const acc of coa.filter(a => a.parentCode)) {
      const created = await prisma.finAccount.create({
        data: {
          tenantId: tenant.id, code: acc.code, name: acc.name, type: acc.type,
          category: acc.category, normalBalance: acc.normalBalance,
          isDetail: acc.isDetail, isSystem: acc.isSystem,
          isBankAccount: (acc as any).isBankAccount ?? false,
          level: acc.level, parentId: accountMap.get(acc.parentCode!),
          createdBy: adminUser.id, updatedBy: adminUser.id,
        },
      })
      accountMap.set(acc.code, created.id)
    }
    console.log(`   → Seeded ${coa.length} chart of accounts`)
  }

  // Seed default fiscal year (current year)
  const existingFiscalYear = await prisma.finFiscalYear.findFirst({ where: { tenantId: tenant.id } })
  if (!existingFiscalYear) {
    const year = new Date().getFullYear()
    const fy = await prisma.finFiscalYear.create({
      data: {
        tenantId: tenant.id, name: `FY ${year}`, code: `FY${year}`,
        startDate: new Date(`${year}-01-01`), endDate: new Date(`${year}-12-31`),
        status: 'active', isDefault: true,
        createdBy: adminUser.id, updatedBy: adminUser.id,
      },
    })
    for (let i = 0; i < 12; i++) {
      const pStart = new Date(year, i, 1)
      const pEnd = new Date(year, i + 1, 0)
      await prisma.finPeriod.create({
        data: {
          tenantId: tenant.id, fiscalYearId: fy.id,
          name: pStart.toLocaleString('en', { month: 'long', year: 'numeric' }),
          periodNumber: i + 1, startDate: pStart, endDate: pEnd,
          status: i <= new Date().getMonth() ? 'open' : 'open',
          createdBy: adminUser.id, updatedBy: adminUser.id,
        },
      })
    }
    console.log(`   → Seeded fiscal year FY${year} with 12 periods`)
  }

  // Seed default bank account linked to 1110 Cash
  const existingBankAcc = await prisma.finBankAccount.findFirst({ where: { tenantId: tenant.id } })
  if (!existingBankAcc) {
    const cashAccount = await prisma.finAccount.findFirst({ where: { tenantId: tenant.id, code: '1110' } })
    if (cashAccount) {
      await prisma.finBankAccount.create({
        data: {
          tenantId: tenant.id, accountId: cashAccount.id,
          name: 'Main Operating Account', bankName: 'Demo Bank',
          currency: 'USD', openingBalance: 0, currentBalance: 0,
          createdBy: adminUser.id, updatedBy: adminUser.id,
        },
      })
      console.log('   → Seeded default bank account')
    }
  }

  // -------------------------------------------------------------------------
  // 18. Seed Inventory master data
  // -------------------------------------------------------------------------
  console.log('   → Seeding Inventory master data...')

  // Categories
  const catDefs = [
    { code: 'ELEC', name: 'Electronics', description: 'Electronic components and devices' },
    { code: 'OFFC', name: 'Office Supplies', description: 'Office consumables and stationery' },
    { code: 'RAWM', name: 'Raw Materials', description: 'Raw materials for manufacturing' },
    { code: 'FNGD', name: 'Finished Goods', description: 'Finished products ready for sale' },
    { code: 'CONS', name: 'Consumables', description: 'Consumable goods and supplies' },
  ]
  for (const cat of catDefs) {
    const existing = await prisma.invCategory.findFirst({ where: { tenantId: tenant.id, code: cat.code } })
    if (!existing) {
      await prisma.invCategory.create({ data: { tenantId: tenant.id, ...cat, createdBy: adminUser.id, updatedBy: adminUser.id } })
    }
  }

  // Units of Measure
  const unitDefs = [
    { symbol: 'pcs', name: 'Piece', type: 'count', isBase: true },
    { symbol: 'kg', name: 'Kilogram', type: 'weight', isBase: true },
    { symbol: 'g', name: 'Gram', type: 'weight', isBase: false },
    { symbol: 'L', name: 'Liter', type: 'volume', isBase: true },
    { symbol: 'mL', name: 'Milliliter', type: 'volume', isBase: false },
    { symbol: 'box', name: 'Box', type: 'count', isBase: false },
    { symbol: 'm', name: 'Meter', type: 'length', isBase: true },
  ]
  for (const unit of unitDefs) {
    const existing = await prisma.invUnit.findFirst({ where: { tenantId: tenant.id, symbol: unit.symbol } })
    if (!existing) {
      await prisma.invUnit.create({ data: { tenantId: tenant.id, ...unit, createdBy: adminUser.id, updatedBy: adminUser.id } })
    }
  }

  // Default warehouse
  const existingWarehouse = await prisma.invWarehouse.findFirst({ where: { tenantId: tenant.id } })
  if (!existingWarehouse) {
    const warehouse = await prisma.invWarehouse.create({
      data: {
        tenantId: tenant.id, code: 'WH-001', name: 'Main Warehouse',
        address: '1 Warehouse Road', city: 'Erbil', country: 'Iraq',
        isDefault: true, createdBy: adminUser.id, updatedBy: adminUser.id,
      },
    })
    // Create default zones
    const receiveZone = await prisma.invWarehouseZone.create({
      data: { tenantId: tenant.id, warehouseId: warehouse.id, code: 'Z-RECV', name: 'Receiving', type: 'receiving', createdBy: adminUser.id, updatedBy: adminUser.id },
    })
    const storageZone = await prisma.invWarehouseZone.create({
      data: { tenantId: tenant.id, warehouseId: warehouse.id, code: 'Z-STOR', name: 'Main Storage', type: 'storage', createdBy: adminUser.id, updatedBy: adminUser.id },
    })
    const shipZone = await prisma.invWarehouseZone.create({
      data: { tenantId: tenant.id, warehouseId: warehouse.id, code: 'Z-SHIP', name: 'Shipping', type: 'shipping', createdBy: adminUser.id, updatedBy: adminUser.id },
    })
    // Create bins in storage zone
    for (const code of ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03']) {
      await prisma.invBin.create({
        data: { tenantId: tenant.id, zoneId: storageZone.id, code, name: `Bin ${code}`, createdBy: adminUser.id, updatedBy: adminUser.id },
      })
    }
    console.log('   → Seeded Main Warehouse with zones and bins')
  }

  // Sample products
  const pcsUnit = await prisma.invUnit.findFirst({ where: { tenantId: tenant.id, symbol: 'pcs' } })
  const kgUnit = await prisma.invUnit.findFirst({ where: { tenantId: tenant.id, symbol: 'kg' } })
  const elecCat = await prisma.invCategory.findFirst({ where: { tenantId: tenant.id, code: 'ELEC' } })
  const offcCat = await prisma.invCategory.findFirst({ where: { tenantId: tenant.id, code: 'OFFC' } })

  const sampleProducts = [
    { code: 'PROD-001', name: 'Laptop Computer', categoryId: elecCat?.id, unitId: pcsUnit?.id, type: 'storable', costPrice: 750, salePrice: 999, minStockLevel: 5, trackSerial: true },
    { code: 'PROD-002', name: 'Wireless Mouse', categoryId: elecCat?.id, unitId: pcsUnit?.id, type: 'storable', costPrice: 15, salePrice: 25, minStockLevel: 20 },
    { code: 'PROD-003', name: 'A4 Paper Ream', categoryId: offcCat?.id, unitId: pcsUnit?.id, type: 'storable', costPrice: 3.5, salePrice: 5.5, minStockLevel: 50 },
  ]
  for (const prod of sampleProducts) {
    const existing = await prisma.invProduct.findFirst({ where: { tenantId: tenant.id, code: prod.code } })
    if (!existing) {
      await prisma.invProduct.create({ data: { tenantId: tenant.id, ...prod, createdBy: adminUser.id, updatedBy: adminUser.id } })
    }
  }
  console.log('   → Seeded inventory categories, units, warehouse, and sample products')

  // -------------------------------------------------------------------------
  // 19. Seed Procurement master data
  // -------------------------------------------------------------------------
  console.log('   → Seeding Procurement master data...')

  const supplierCategories = [
    { name: 'Raw Materials', code: 'RAW', description: 'Suppliers providing raw production materials' },
    { name: 'IT & Technology', code: 'IT', description: 'Hardware, software, and technology vendors' },
    { name: 'Office Supplies', code: 'OFF', description: 'General office and stationery suppliers' },
    { name: 'Logistics & Freight', code: 'LOG', description: 'Shipping, freight, and logistics providers' },
    { name: 'Services', code: 'SVC', description: 'Professional and consulting services' },
  ]

  const createdCategories: Record<string, string> = {}
  for (const cat of supplierCategories) {
    const existing = await prisma.procSupplierCategory.findFirst({ where: { tenantId: tenant.id, code: cat.code } })
    if (!existing) {
      const created = await prisma.procSupplierCategory.create({
        data: { tenantId: tenant.id, ...cat, createdBy: adminUser.id, updatedBy: adminUser.id },
      })
      createdCategories[cat.code] = created.id
    } else {
      createdCategories[cat.code] = existing.id
    }
  }

  const sampleSuppliers = [
    {
      code: 'SUP-0001', name: 'Global Materials Co.', legalName: 'Global Materials Corporation Ltd.',
      categoryId: createdCategories['RAW'],
      taxId: 'TX-001-2024', email: 'procurement@globalmaterials.com', phone: '+1-555-100-0001',
      city: 'Chicago', country: 'US', currency: 'USD', paymentTerms: 'Net 30',
      leadTimeDays: 14, status: 'active',
    },
    {
      code: 'SUP-0002', name: 'TechParts Inc.', legalName: 'TechParts Incorporated',
      categoryId: createdCategories['IT'],
      taxId: 'TX-002-2024', email: 'sales@techparts.com', phone: '+1-555-200-0002',
      city: 'San Jose', country: 'US', currency: 'USD', paymentTerms: 'Net 45',
      leadTimeDays: 7, status: 'active',
    },
    {
      code: 'SUP-0003', name: 'OfficeWorld GmbH', legalName: 'OfficeWorld GmbH',
      categoryId: createdCategories['OFF'],
      taxId: 'DE-003-2024', email: 'orders@officeworld.de', phone: '+49-555-300-0003',
      city: 'Berlin', country: 'DE', currency: 'EUR', paymentTerms: 'Net 30',
      leadTimeDays: 5, status: 'active',
    },
  ]

  for (const sup of sampleSuppliers) {
    const existing = await prisma.procSupplier.findFirst({ where: { tenantId: tenant.id, code: sup.code } })
    if (!existing) {
      await prisma.procSupplier.create({
        data: { tenantId: tenant.id, ...sup, createdBy: adminUser.id, updatedBy: adminUser.id },
      })
    }
  }

  console.log('   → Seeded procurement supplier categories and sample suppliers')

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
