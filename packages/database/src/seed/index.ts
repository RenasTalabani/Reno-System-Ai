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
    // Manufacturing
    { module: 'manufacturing', resource: 'bom', action: 'read', scope: 'company' },
    { module: 'manufacturing', resource: 'bom', action: 'manage', scope: 'company' },
    { module: 'manufacturing', resource: 'work_centers', action: 'read', scope: 'company' },
    { module: 'manufacturing', resource: 'work_centers', action: 'manage', scope: 'company' },
    { module: 'manufacturing', resource: 'routings', action: 'manage', scope: 'company' },
    { module: 'manufacturing', resource: 'orders', action: 'read', scope: 'company' },
    { module: 'manufacturing', resource: 'orders', action: 'create', scope: 'company' },
    { module: 'manufacturing', resource: 'orders', action: 'manage', scope: 'company' },
    { module: 'manufacturing', resource: 'orders', action: 'produce', scope: 'company' },
    { module: 'manufacturing', resource: 'quality', action: 'read', scope: 'company' },
    { module: 'manufacturing', resource: 'quality', action: 'manage', scope: 'company' },
    { module: 'manufacturing', resource: 'maintenance', action: 'read', scope: 'company' },
    { module: 'manufacturing', resource: 'maintenance', action: 'manage', scope: 'company' },
    { module: 'manufacturing', resource: 'mrp', action: 'read', scope: 'company' },
    { module: 'manufacturing', resource: 'mrp', action: 'run', scope: 'company' },
    { module: 'manufacturing', resource: 'mrp', action: 'manage', scope: 'company' },
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

  // -------------------------------------------------------------------------
  // 20. Seed Manufacturing master data
  // -------------------------------------------------------------------------
  console.log('   → Seeding Manufacturing master data...')

  const sampleWorkCenters = [
    {
      code: 'WC-001', name: 'Assembly Line A', type: 'line',
      capacity: 8, capacityUnit: 'hour', costPerHour: 45,
      oeeTarget: 0.85, mtbfHours: 720, mttrHours: 2,
      maintenanceIntervalDays: 30,
      aiMaintenancePriority: 'medium',
    },
    {
      code: 'WC-002', name: 'CNC Machine 01', type: 'machine',
      capacity: 1, capacityUnit: 'hour', costPerHour: 120,
      oeeTarget: 0.80, mtbfHours: 480, mttrHours: 4,
      maintenanceIntervalDays: 14,
      aiMaintenancePriority: 'high',
    },
    {
      code: 'WC-003', name: 'Quality Inspection', type: 'labor',
      capacity: 4, capacityUnit: 'hour', costPerHour: 35,
      oeeTarget: 0.90,
      aiMaintenancePriority: 'low',
    },
  ]

  for (const wc of sampleWorkCenters) {
    const existing = await prisma.mfgWorkCenter.findFirst({ where: { tenantId: tenant.id, code: wc.code } })
    if (!existing) {
      await prisma.mfgWorkCenter.create({
        data: { tenantId: tenant.id, ...wc, currency: 'USD', createdBy: adminUser.id, updatedBy: adminUser.id },
      })
    }
  }

  console.log('   → Seeded manufacturing work centers')

  // -------------------------------------------------------------------------
  // 21. Phase 9 — BI / Analytics seed
  // -------------------------------------------------------------------------
  console.log('   → Seeding analytics permissions and dashboards...')

  const biPermissions = [
    { module: 'analytics', resource: 'dashboards', action: 'read', scope: 'company' },
    { module: 'analytics', resource: 'dashboards', action: 'create', scope: 'company' },
    { module: 'analytics', resource: 'dashboards', action: 'update', scope: 'company' },
    { module: 'analytics', resource: 'dashboards', action: 'delete', scope: 'company' },
    { module: 'analytics', resource: 'reports', action: 'read', scope: 'company' },
    { module: 'analytics', resource: 'reports', action: 'create', scope: 'company' },
    { module: 'analytics', resource: 'reports', action: 'update', scope: 'company' },
    { module: 'analytics', resource: 'reports', action: 'delete', scope: 'company' },
    { module: 'analytics', resource: 'reports', action: 'export', scope: 'company' },
    { module: 'analytics', resource: 'kpis', action: 'read', scope: 'company' },
    { module: 'analytics', resource: 'insights', action: 'read', scope: 'company' },
    { module: 'analytics', resource: 'insights', action: 'manage', scope: 'company' },
    { module: 'analytics', resource: 'health_score', action: 'read', scope: 'company' },
    { module: 'analytics', resource: 'health_score', action: 'compute', scope: 'company' },
    { module: 'analytics', resource: 'scheduled_reports', action: 'manage', scope: 'company' },
  ]

  for (const p of biPermissions) {
    await prisma.corePermission.upsert({
      where: { module_resource_action_scope: p },
      create: p,
      update: {},
    })
  }

  // Seed executive dashboard
  const execDashSlug = 'executive-overview'
  const existingExecDash = await prisma.biDashboard.findFirst({ where: { tenantId: tenant.id, slug: execDashSlug } })
  if (!existingExecDash) {
    const execDash = await prisma.biDashboard.create({
      data: {
        tenantId: tenant.id,
        name: 'Executive Overview',
        slug: execDashSlug,
        description: 'Cross-module executive dashboard with key business metrics',
        type: 'executive',
        isDefault: true,
        isPublic: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    // Seed default widgets
    const defaultWidgets = [
      { title: 'Revenue MTD', type: 'kpi', module: 'finance', dataSource: 'finance.revenue', positionX: 0, positionY: 0, width: 3, height: 2 },
      { title: 'Open Sales Orders', type: 'kpi', module: 'sales', dataSource: 'sales.open_orders', positionX: 3, positionY: 0, width: 3, height: 2 },
      { title: 'Total Employees', type: 'kpi', module: 'hr', dataSource: 'hr.headcount', positionX: 6, positionY: 0, width: 3, height: 2 },
      { title: 'Stock Value', type: 'kpi', module: 'inventory', dataSource: 'inventory.stock_value', positionX: 9, positionY: 0, width: 3, height: 2 },
      { title: 'Company Health Score', type: 'gauge', module: 'analytics', dataSource: 'analytics.health_score', positionX: 0, positionY: 2, width: 4, height: 3 },
      { title: 'Finance Performance', type: 'bar_chart', module: 'finance', dataSource: 'finance.monthly_trend', positionX: 4, positionY: 2, width: 8, height: 3 },
    ]

    for (const w of defaultWidgets) {
      await prisma.biWidget.create({ data: { tenantId: tenant.id, dashboardId: execDash.id, ...w } })
    }
  }

  // Seed department scorecard dashboard
  const deptDashSlug = 'department-scorecards'
  const existingDeptDash = await prisma.biDashboard.findFirst({ where: { tenantId: tenant.id, slug: deptDashSlug } })
  if (!existingDeptDash) {
    await prisma.biDashboard.create({
      data: {
        tenantId: tenant.id,
        name: 'Department Scorecards',
        slug: deptDashSlug,
        description: 'Performance scorecards for each department',
        type: 'department',
        isDefault: false,
        isPublic: true,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })
  }

  // Seed sample reports
  const sampleReports = [
    {
      name: 'Sales Orders Summary',
      module: 'sales',
      entity: 'orders',
      columns: [{ field: 'number', label: 'Order #' }, { field: 'status', label: 'Status' }, { field: 'grandTotal', label: 'Total' }, { field: 'createdAt', label: 'Date' }],
    },
    {
      name: 'Employee Roster',
      module: 'hr',
      entity: 'employees',
      columns: [{ field: 'employeeNumber', label: 'Emp #' }, { field: 'firstName', label: 'First' }, { field: 'lastName', label: 'Last' }, { field: 'status', label: 'Status' }],
    },
    {
      name: 'Inventory Stock Levels',
      module: 'inventory',
      entity: 'stock',
      columns: [{ field: 'onHand', label: 'On Hand' }, { field: 'reserved', label: 'Reserved' }, { field: 'available', label: 'Available' }, { field: 'totalValue', label: 'Value' }],
    },
  ]

  for (const r of sampleReports) {
    const existing = await prisma.biReport.findFirst({ where: { tenantId: tenant.id, name: r.name } })
    if (!existing) {
      await prisma.biReport.create({
        data: { tenantId: tenant.id, ...r, isPublic: true, createdBy: adminUser.id, updatedBy: adminUser.id },
      })
    }
  }

  console.log('   → Seeded analytics dashboards, widgets, and reports')

  // -------------------------------------------------------------------------
  // 22. Phase 10 — Reno Brain / AI Core seed
  // -------------------------------------------------------------------------
  console.log('   → Seeding Brain AI agents and permissions...')

  const brainPermissions = [
    { module: 'brain', resource: 'chat', action: 'read', scope: 'own' },
    { module: 'brain', resource: 'chat', action: 'create', scope: 'own' },
    { module: 'brain', resource: 'agents', action: 'read', scope: 'company' },
    { module: 'brain', resource: 'agents', action: 'manage', scope: 'company' },
    { module: 'brain', resource: 'memory', action: 'read', scope: 'company' },
    { module: 'brain', resource: 'memory', action: 'manage', scope: 'company' },
    { module: 'brain', resource: 'actions', action: 'read', scope: 'company' },
    { module: 'brain', resource: 'actions', action: 'approve', scope: 'company' },
    { module: 'brain', resource: 'providers', action: 'read', scope: 'company' },
    { module: 'brain', resource: 'providers', action: 'manage', scope: 'company' },
    { module: 'brain', resource: 'templates', action: 'read', scope: 'company' },
    { module: 'brain', resource: 'templates', action: 'manage', scope: 'company' },
    { module: 'brain', resource: 'audit', action: 'read', scope: 'company' },
    { module: 'brain', resource: 'dashboard', action: 'read', scope: 'company' },
  ]

  for (const p of brainPermissions) {
    await prisma.corePermission.upsert({
      where: { module_resource_action_scope: p },
      create: p,
      update: {},
    })
  }

  // Seed 9 system agents (tenantId: null, isSystem: true)
  const systemAgentDefs = [
    {
      slug: 'reno-ceo',
      name: 'Reno CEO',
      title: 'Chief Executive Officer AI',
      description: 'Full business overview with cross-module intelligence. Ask about revenue, headcount, operations, inventory, and company health in one conversation.',
      iconName: 'Crown',
      color: 'indigo',
      modules: ['finance', 'sales', 'hr', 'inventory', 'procurement', 'manufacturing', 'projects', 'crm', 'analytics'],
      systemPrompt: 'You are Reno CEO, the top-level AI advisor for this business. You have access to data from all business modules and can provide strategic insights, cross-departmental analysis, and executive-level recommendations. Always ground your answers in the live business data provided.',
      maxTokens: 4096,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'medium',
    },
    {
      slug: 'reno-coo',
      name: 'Reno COO',
      title: 'Chief Operating Officer AI',
      description: 'Operational intelligence across manufacturing, inventory, procurement, and projects. Optimize workflows and identify bottlenecks.',
      iconName: 'Workflow',
      color: 'blue',
      modules: ['manufacturing', 'inventory', 'procurement', 'projects'],
      systemPrompt: 'You are Reno COO, the operations AI advisor. You specialize in manufacturing, inventory, procurement, and project management. Focus on operational efficiency, supply chain optimization, and production planning.',
      maxTokens: 4096,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'medium',
    },
    {
      slug: 'reno-hr-director',
      name: 'Reno HR Director',
      title: 'Human Resources AI',
      description: 'HR analytics including headcount, attendance, leave, payroll insights, and workforce planning.',
      iconName: 'UsersRound',
      color: 'purple',
      modules: ['hr'],
      systemPrompt: 'You are Reno HR Director, the human resources AI advisor. You help with employee analytics, attendance patterns, leave management, payroll insights, and workforce planning. Always maintain employee privacy and confidentiality.',
      maxTokens: 2048,
      requiresApproval: true,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'high',
    },
    {
      slug: 'reno-sales-director',
      name: 'Reno Sales Director',
      title: 'Sales & CRM AI',
      description: 'Sales pipeline, revenue forecasting, customer insights, and CRM analytics.',
      iconName: 'TrendingUp',
      color: 'green',
      modules: ['sales', 'crm'],
      systemPrompt: 'You are Reno Sales Director, the sales and CRM AI advisor. Help with pipeline analysis, revenue forecasting, customer insights, and sales performance optimization.',
      maxTokens: 2048,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'low',
    },
    {
      slug: 'reno-accountant',
      name: 'Reno Accountant',
      title: 'Finance & Accounting AI',
      description: 'Financial statements, cash flow, expense analysis, vendor bills, and accounting insights.',
      iconName: 'BarChart3',
      color: 'cyan',
      modules: ['finance'],
      systemPrompt: 'You are Reno Accountant, the finance AI advisor. You specialize in financial analysis, accounting, cash flow, expense tracking, and financial planning. Provide accurate, data-driven financial insights.',
      maxTokens: 2048,
      requiresApproval: true,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'high',
    },
    {
      slug: 'reno-inventory-manager',
      name: 'Reno Inventory Manager',
      title: 'Inventory & Stock AI',
      description: 'Stock levels, reorder alerts, warehouse efficiency, and product movement analysis.',
      iconName: 'Package',
      color: 'yellow',
      modules: ['inventory'],
      systemPrompt: 'You are Reno Inventory Manager, the inventory AI advisor. Help with stock level analysis, reorder recommendations, warehouse optimization, and product movement tracking.',
      maxTokens: 2048,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'medium',
    },
    {
      slug: 'reno-procurement-director',
      name: 'Reno Procurement Director',
      title: 'Procurement & Supply Chain AI',
      description: 'Purchase orders, supplier performance, cost optimization, and supply chain risk analysis.',
      iconName: 'ShoppingCart',
      color: 'orange',
      modules: ['procurement', 'inventory'],
      systemPrompt: 'You are Reno Procurement Director, the supply chain AI advisor. Help with purchase order analysis, supplier evaluation, cost optimization, and supply chain risk management.',
      maxTokens: 2048,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'medium',
    },
    {
      slug: 'reno-production-director',
      name: 'Reno Production Director',
      title: 'Manufacturing & Production AI',
      description: 'Manufacturing orders, work center utilization, quality control, and production efficiency.',
      iconName: 'Factory',
      color: 'red',
      modules: ['manufacturing', 'inventory'],
      systemPrompt: 'You are Reno Production Director, the manufacturing AI advisor. Help with production planning, work center utilization, quality control, and manufacturing efficiency optimization.',
      maxTokens: 2048,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'medium',
    },
    {
      slug: 'reno-analyst',
      name: 'Reno Analyst',
      title: 'Business Intelligence AI',
      description: 'Deep analytics, KPI tracking, trend analysis, forecasting, and AI-generated business insights.',
      iconName: 'Activity',
      color: 'teal',
      modules: ['analytics', 'finance', 'sales', 'hr', 'inventory', 'manufacturing'],
      systemPrompt: 'You are Reno Analyst, the business intelligence AI. You specialize in deep data analysis, KPI computation, trend identification, forecasting, and generating actionable business insights from cross-module data.',
      maxTokens: 8192,
      requiresApproval: false,
      canSuggestActions: true,
      canExecuteActions: false,
      riskLevel: 'low',
    },
  ]

  for (const agent of systemAgentDefs) {
    const existing = await prisma.brainAgent.findFirst({ where: { slug: agent.slug, isSystem: true } })
    if (!existing) {
      await prisma.brainAgent.create({
        data: {
          tenantId: null,
          isSystem: true,
          ...agent,
        },
      })
    }
  }

  // Seed default prompt templates (system-level, no tenant)
  const systemTemplates = [
    {
      slug: 'monthly-revenue-summary',
      name: 'Monthly Revenue Summary',
      description: 'Generate a concise summary of this month\'s revenue performance',
      template: 'Provide a concise summary of revenue performance for {{month}} {{year}}. Include total revenue, comparison to last month, top products/customers, and key insights.',
      variables: { month: 'string', year: 'string' },
      category: 'finance',
    },
    {
      slug: 'inventory-reorder-check',
      name: 'Inventory Reorder Check',
      description: 'Identify products that need reordering',
      template: 'Review current inventory levels and identify products that are below minimum stock levels or at risk of stockout in the next {{days}} days. Suggest reorder quantities.',
      variables: { days: 'number' },
      category: 'inventory',
    },
    {
      slug: 'hr-headcount-summary',
      name: 'HR Headcount Summary',
      description: 'Summarize current workforce by department',
      template: 'Provide a headcount summary by department, including active employees, recent hires in the last {{months}} months, and any notable attendance or leave patterns.',
      variables: { months: 'number' },
      category: 'hr',
    },
    {
      slug: 'sales-pipeline-review',
      name: 'Sales Pipeline Review',
      description: 'Analyze the current sales pipeline',
      template: 'Analyze the current sales pipeline. Show open opportunities by stage, estimated value, conversion rates, and which deals are at risk. Focus on deals expected to close in {{days}} days.',
      variables: { days: 'number' },
      category: 'sales',
    },
  ]

  for (const tpl of systemTemplates) {
    const existing = await prisma.brainPromptTemplate.findFirst({ where: { slug: tpl.slug, isSystem: true } })
    if (!existing) {
      await prisma.brainPromptTemplate.create({
        data: {
          tenantId: null,
          isSystem: true,
          ...tpl,
        },
      })
    }
  }

  console.log('   → Seeded 9 Brain system agents and 4 prompt templates')

  // -------------------------------------------------------------------------
  // 23. Phase 11 — Automation / Workflow Engine seed
  // -------------------------------------------------------------------------
  console.log('   → Seeding Automation permissions and templates...')

  const autoPermissions = [
    { module: 'automation', resource: 'workflows', action: 'read', scope: 'company' },
    { module: 'automation', resource: 'workflows', action: 'create', scope: 'company' },
    { module: 'automation', resource: 'workflows', action: 'update', scope: 'company' },
    { module: 'automation', resource: 'workflows', action: 'delete', scope: 'company' },
    { module: 'automation', resource: 'workflows', action: 'run', scope: 'company' },
    { module: 'automation', resource: 'executions', action: 'read', scope: 'company' },
    { module: 'automation', resource: 'executions', action: 'cancel', scope: 'company' },
    { module: 'automation', resource: 'approvals', action: 'read', scope: 'company' },
    { module: 'automation', resource: 'approvals', action: 'decide', scope: 'company' },
    { module: 'automation', resource: 'templates', action: 'read', scope: 'company' },
    { module: 'automation', resource: 'templates', action: 'install', scope: 'company' },
    { module: 'automation', resource: 'webhooks', action: 'manage', scope: 'company' },
    { module: 'automation', resource: 'events', action: 'read', scope: 'company' },
    { module: 'automation', resource: 'events', action: 'fire', scope: 'company' },
  ]

  for (const p of autoPermissions) {
    await prisma.corePermission.upsert({
      where: { module_resource_action_scope: p },
      create: p,
      update: {},
    })
  }

  // System workflow templates
  const systemTemplates = [
    {
      name: 'Welcome New Employee',
      description: 'Automatically notify HR team and create onboarding tasks when a new employee is added',
      category: 'hr',
      tags: ['hr', 'onboarding', 'notification'],
      icon: 'UsersRound',
      useCase: 'Use this template to automate the employee onboarding notification flow. Fires when a new employee record is created.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'hr.employee.hired' },
        steps: [
          {
            id: 'step_1',
            name: 'Send HR Team Notification',
            type: 'notification',
            config: {
              title: 'New Employee Hired',
              message: 'A new employee has joined: {{triggerData.name}}. Please complete onboarding.',
              level: 'info',
              recipient: 'all',
            },
            onSuccess: 'step_2',
            onFailure: 'end',
          },
          {
            id: 'step_2',
            name: 'Log Onboarding Start',
            type: 'log',
            config: { message: 'Onboarding initiated for {{triggerData.name}} on {{triggerData.hireDate}}' },
            onSuccess: 'end',
          },
        ],
      },
    },
    {
      name: 'Low Stock Alert & Reorder',
      description: 'Notify procurement when inventory falls below minimum level and request purchase order approval',
      category: 'inventory',
      tags: ['inventory', 'procurement', 'alert', 'approval'],
      icon: 'Package',
      useCase: 'Automatically alert the procurement team when stock levels drop below threshold and route to approval.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'inventory.stock.low' },
        steps: [
          {
            id: 'step_1',
            name: 'Notify Procurement Team',
            type: 'notification',
            config: {
              title: 'Low Stock Alert',
              message: 'Product {{triggerData.productName}} is below minimum stock level ({{triggerData.currentStock}} remaining)',
              level: 'warning',
              recipient: 'all',
            },
            onSuccess: 'step_2',
            onFailure: 'end',
          },
          {
            id: 'step_2',
            name: 'Request PO Approval',
            type: 'approval',
            config: {
              title: 'Create Purchase Order',
              description: 'Stock for {{triggerData.productName}} is critically low. Approve to create a reorder.',
              riskLevel: 'medium',
              expiresInHours: 24,
            },
            onApproved: 'step_3',
            onRejected: 'end',
          },
          {
            id: 'step_3',
            name: 'Log PO Request',
            type: 'log',
            config: { message: 'Purchase order approved for {{triggerData.productName}}. Procurement team to proceed.' },
            onSuccess: 'end',
          },
        ],
      },
    },
    {
      name: 'New Lead Auto-Assign Notification',
      description: 'Notify the sales team when a new CRM lead is created',
      category: 'crm',
      tags: ['crm', 'sales', 'leads', 'notification'],
      icon: 'TrendingUp',
      useCase: 'Fires when a new lead arrives in the CRM, notifies all sales team members immediately.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'crm.lead.created' },
        steps: [
          {
            id: 'step_1',
            name: 'Notify Sales Team',
            type: 'notification',
            config: {
              title: 'New Lead: {{triggerData.name}}',
              message: 'A new lead has been created from {{triggerData.source}}. Assign and follow up.',
              level: 'info',
              recipient: 'all',
            },
            onSuccess: 'end',
            onFailure: 'end',
          },
        ],
      },
    },
    {
      name: 'Overdue Invoice Escalation',
      description: 'Alert finance team when a customer invoice becomes overdue',
      category: 'finance',
      tags: ['finance', 'invoices', 'collections', 'alert'],
      icon: 'BarChart3',
      useCase: 'Automatically escalates overdue customer invoices to the finance team for follow-up action.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'sales.invoice.overdue' },
        steps: [
          {
            id: 'step_1',
            name: 'Alert Finance Team',
            type: 'notification',
            config: {
              title: 'Invoice Overdue',
              message: 'Invoice {{triggerData.number}} for {{triggerData.customerName}} ({{triggerData.total}}) is overdue.',
              level: 'warning',
              recipient: 'all',
            },
            onSuccess: 'end',
          },
        ],
      },
    },
    {
      name: 'High-Value PO Approval Gate',
      description: 'Route large purchase orders through an approval gate before processing',
      category: 'procurement',
      tags: ['procurement', 'approval', 'finance', 'governance'],
      icon: 'ShoppingCart',
      useCase: 'Any purchase order above a threshold requires manager approval before being confirmed.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'procurement.order.created' },
        steps: [
          {
            id: 'step_1',
            name: 'Check Order Amount',
            type: 'condition',
            config: {
              logic: 'all',
              conditions: [{ field: 'triggerData.totalAmount', operator: 'gt', value: 5000 }],
            },
            onTrue: 'step_2',
            onFalse: 'end',
          },
          {
            id: 'step_2',
            name: 'Manager Approval Required',
            type: 'approval',
            config: {
              title: 'High-Value Purchase Order Approval',
              description: 'Purchase order {{triggerData.number}} for {{triggerData.totalAmount}} requires management approval.',
              riskLevel: 'high',
              expiresInHours: 48,
            },
            onApproved: 'step_3',
            onRejected: 'end',
          },
          {
            id: 'step_3',
            name: 'Notify Approval',
            type: 'notification',
            config: {
              title: 'PO Approved',
              message: 'Purchase order {{triggerData.number}} has been approved.',
              level: 'success',
              recipient: 'triggeredBy',
            },
            onSuccess: 'end',
          },
        ],
      },
    },
    {
      name: 'Manufacturing Order Complete Alert',
      description: 'Notify warehouse when a manufacturing order completes',
      category: 'manufacturing',
      tags: ['manufacturing', 'inventory', 'warehouse', 'notification'],
      icon: 'Factory',
      useCase: 'Automatically alerts the warehouse team when production finishes so they can receive finished goods.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'manufacturing.order.completed' },
        steps: [
          {
            id: 'step_1',
            name: 'Notify Warehouse',
            type: 'notification',
            config: {
              title: 'Production Complete',
              message: 'Manufacturing order {{triggerData.number}} has completed. Receive {{triggerData.quantity}} units of {{triggerData.productName}} in warehouse.',
              level: 'info',
              recipient: 'all',
            },
            onSuccess: 'end',
          },
        ],
      },
    },
    {
      name: 'Daily Business Summary',
      description: 'Send a daily summary notification with key business metrics at 9am',
      category: 'cross-module',
      tags: ['scheduled', 'daily', 'summary', 'analytics'],
      icon: 'Activity',
      useCase: 'Runs every morning at 9am to remind the team to review daily metrics in Reno Analytics.',
      triggerType: 'scheduled',
      definition: {
        triggerConfig: { intervalMs: 86400000, nextRunAt: null },
        steps: [
          {
            id: 'step_1',
            name: 'Send Daily Reminder',
            type: 'notification',
            config: {
              title: 'Daily Business Review',
              message: 'Good morning! Review today\'s KPIs in Analytics. Check pending approvals and open orders.',
              level: 'info',
              recipient: 'all',
            },
            onSuccess: 'end',
          },
        ],
      },
    },
    {
      name: 'Won Opportunity Celebration',
      description: 'Notify the whole team when a deal is marked as Won in CRM',
      category: 'sales',
      tags: ['crm', 'sales', 'celebration', 'won'],
      icon: 'TrendingUp',
      useCase: 'Boosts team morale by automatically broadcasting when a new deal is won.',
      triggerType: 'event',
      definition: {
        triggerConfig: { eventType: 'crm.opportunity.won' },
        steps: [
          {
            id: 'step_1',
            name: 'Announce Win',
            type: 'notification',
            config: {
              title: 'Deal Won!',
              message: 'Opportunity "{{triggerData.name}}" worth {{triggerData.value}} has been won! Great work team.',
              level: 'success',
              recipient: 'all',
            },
            onSuccess: 'end',
          },
        ],
      },
    },
  ]

  for (const tpl of systemTemplates) {
    const existing = await prisma.autoTemplate.findFirst({ where: { name: tpl.name, isSystem: true } })
    if (!existing) {
      await prisma.autoTemplate.create({
        data: {
          tenantId: null,
          isSystem: true,
          isPublic: true,
          ...tpl,
        },
      })
    }
  }

  console.log(`   → Seeded 14 automation permissions and ${systemTemplates.length} system workflow templates`)

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
