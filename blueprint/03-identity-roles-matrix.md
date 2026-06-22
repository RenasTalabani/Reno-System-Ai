# Reno System — Master Blueprint v1
## Document 3: Identity & Roles Matrix

**Project:** Reno System  
**Owner:** Renas Talabani  
**Status:** DRAFT — Awaiting Owner Approval  
**Version:** 1.0.0  
**Date:** 2026-06-22  

---

## 1. Identity Architecture Overview

Reno System uses a **unified identity model** where one user account can participate in multiple companies, branches, and departments within a single tenant — with different roles in each context.

```
Tenant
  └── Company A
        ├── Branch 1
        │     ├── Department: HR
        │     └── Department: Finance
        └── Branch 2
              └── Department: Operations
  └── Company B (same tenant, multi-company)
        └── Branch 1
```

A single user (e.g., Renas) can be:
- `Company Admin` in Company A
- `Finance Viewer` in Company B
- `HR Manager` scoped to Branch 1 only

---

## 2. Authentication System

### 2.1 Login Flow

```
1. POST /auth/login  { email, password, tenant_slug }
2. Validate email + bcrypt password (cost 12)
3. Check account status (active/suspended/locked)
4. If MFA enabled → return { mfa_required: true, temp_token }
5. POST /auth/mfa/verify  { temp_token, code }
6. Validate TOTP code (30s window, ±1 step tolerance)
7. Issue:
   - Access Token: RS256 JWT, 15 minutes TTL
   - Refresh Token: Opaque UUID, 7 days TTL, stored in Redis
   - HTTP-only cookie for refresh token (web)
   - Secure storage for mobile/desktop
```

### 2.2 JWT Access Token Payload

```json
{
  "sub": "user-uuid",
  "tid": "tenant-uuid",
  "sid": "session-uuid",
  "roles": ["hr_manager", "project_viewer"],
  "companies": ["company-uuid-1"],
  "iat": 1750000000,
  "exp": 1750000900
}
```

### 2.3 Token Refresh Flow

```
POST /auth/refresh  (refresh token in cookie or body)
→ Validate refresh token in Redis (exists, not revoked, not expired)
→ Rotate refresh token (issue new, invalidate old)
→ Issue new access token
→ Return new pair
```

### 2.4 Logout

```
POST /auth/logout
→ Revoke current refresh token in Redis
→ Clear HTTP-only cookie
→ Log audit event: "auth.user.logout"
```

### 2.5 Multi-Device Sessions

Each login creates a separate session entry in `core_sessions`. Users can view and revoke individual sessions from their profile (Security tab).

---

## 3. MFA System

| Method | Implementation | Status |
|---|---|---|
| TOTP (Time-based OTP) | RFC 6238, Google Authenticator compatible | Phase 0 |
| SMS OTP | Twilio integration | Phase 1 |
| Email OTP | Fallback option | Phase 0 |
| Hardware Key (FIDO2) | WebAuthn | Future |

MFA setup flow:
1. User enables MFA in settings
2. Server generates TOTP secret (Base32 encoded)
3. Server returns QR code + secret
4. User scans with authenticator app
5. User confirms with a valid OTP
6. Secret stored encrypted in `core_users.mfa_secret`
7. Backup codes generated and shown once

---

## 4. Permission Model

### 4.1 Permission Format

Every permission follows this 4-part format:

```
{module}:{resource}:{action}:{scope}

Examples:
  hr:employees:read:own
  hr:employees:read:department
  hr:employees:update:all
  hr:payroll:approve:company
  finance:invoices:create:company
  crm:leads:delete:own
  admin:roles:manage:tenant
```

### 4.2 Action Types

| Action | Meaning |
|---|---|
| `read` | View/list records |
| `create` | Create new records |
| `update` | Edit existing records |
| `delete` | Soft-delete records |
| `export` | Export data to CSV/PDF/Excel |
| `import` | Bulk import data |
| `approve` | Approve pending items (leave, invoice, PO) |
| `reject` | Reject pending items |
| `manage` | Full control including settings and configuration |
| `assign` | Assign records to users/teams |
| `audit` | View audit logs for the resource |

### 4.3 Scope Types

| Scope | Meaning |
|---|---|
| `own` | Only records this user created or owns |
| `team` | Records belonging to the user's team |
| `department` | Records in the user's department |
| `branch` | Records in the user's branch |
| `company` | All records in the company |
| `tenant` | All records across all companies in the tenant |
| `all` | Equivalent to tenant-wide (highest scope) |

---

## 5. System Roles (Pre-defined, Cannot Be Deleted)

### 5.1 Super Admin (Reno System Staff Only)

```
slug: super_admin
scope: global
Access: Full access to all tenants, companies, and system configuration.
Used by: Reno System operations team only. Never assigned to tenant users.
```

### 5.2 Tenant Owner

```
slug: tenant_owner
scope: tenant
Access: Full access to everything within their tenant.
Assigned to: The first user who creates/registers the tenant.
Permissions: All permissions with scope=all across all modules.
```

### 5.3 Company Admin

```
slug: company_admin
scope: company
Access: Full administrative access within one company.
Assigned to: Company-level administrator.
Permissions: All permissions with scope=company across all modules.
```

### 5.4 Branch Manager

```
slug: branch_manager
scope: branch
Access: Full management access within their assigned branch.
Permissions: Most permissions with scope=branch.
Cannot: Change tenant-level settings, manage other branches.
```

### 5.5 Department Head

```
slug: department_head
scope: department
Access: Management access for their department.
Permissions: Read/manage employees in department, approve leaves, view reports.
```

### 5.6 Employee (Base Role — All Users)

```
slug: employee
scope: own
Access: Self-service only.
Permissions: View own profile, request leave, view own payslips, submit timesheets.
```

---

## 6. Module-Level Roles (Pre-defined System Roles)

### HR Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `hr_manager` | HR Manager | Full access to all HR data, payroll, recruitment |
| `hr_officer` | HR Officer | Manage employees, attendance, leave (no payroll) |
| `hr_recruiter` | Recruiter | Manage recruitment jobs and applications only |
| `hr_payroll_manager` | Payroll Manager | Payroll runs, salary structures, payslips |
| `hr_viewer` | HR Viewer | Read-only access to HR data |
| `employee_self` | Employee | Self-service (own data only) |

### CRM Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `crm_manager` | CRM Manager | Full CRM access, all leads/contacts/opportunities |
| `crm_sales_rep` | Sales Rep | Own leads and opportunities, create activities |
| `crm_viewer` | CRM Viewer | Read-only CRM access |

### Project Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `project_manager` | Project Manager | Create projects, assign tasks, manage timelines |
| `project_member` | Team Member | View/update assigned tasks, log time |
| `project_viewer` | Project Viewer | Read-only access |

### Sales Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `sales_manager` | Sales Manager | All quotes, orders, invoices; approve discounts |
| `sales_rep` | Sales Rep | Create quotes, manage own orders |
| `finance_approver` | Finance Approver | Approve invoices and payments |

### Finance Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `finance_manager` | Finance Manager | Full access to all financial data |
| `accountant` | Accountant | Journal entries, reconciliation, reports |
| `finance_viewer` | Finance Viewer | Read-only financial data |
| `budget_manager` | Budget Manager | Create and manage budgets |

### Inventory Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `inventory_manager` | Inventory Manager | Full inventory access, adjustments |
| `warehouse_staff` | Warehouse Staff | Record stock movements, receiving |
| `inventory_viewer` | Inventory Viewer | Read-only inventory |

### Procurement Module Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `procurement_manager` | Procurement Manager | Full procurement access |
| `purchaser` | Purchaser | Create PRs and POs |
| `procurement_approver` | Approver | Approve purchase requests |

### IT / Admin Roles

| Role Slug | Name | Key Permissions |
|---|---|---|
| `it_admin` | IT Admin | User management, security settings, integrations |
| `system_auditor` | Auditor | Read-only access to audit logs and security reports |
| `support_agent` | Support Agent | Service desk tickets and knowledge base |

---

## 7. Permission Matrix — Core Module (Phase 0)

| Permission | Tenant Owner | Company Admin | Branch Manager | Department Head | Employee |
|---|---|---|---|---|---|
| users:read:all | ✅ | ✅ | branch | dept | own |
| users:create | ✅ | ✅ | ✅ | ❌ | ❌ |
| users:update | ✅ | ✅ | branch | own | own |
| users:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| roles:manage | ✅ | company | ❌ | ❌ | ❌ |
| permissions:manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| settings:manage | ✅ | company | branch | ❌ | ❌ |
| audit_logs:read | ✅ | company | branch | dept | ❌ |
| branding:manage | ✅ | company | ❌ | ❌ | ❌ |
| companies:manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| branches:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| departments:manage | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 8. Permission Matrix — HR Module (Phase 1)

| Permission | HR Manager | HR Officer | HR Recruiter | Payroll Mgr | Dept Head | Employee |
|---|---|---|---|---|---|---|
| employees:read | ✅ all | ✅ all | ❌ | ✅ all | dept | own |
| employees:create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| employees:update | ✅ | ✅ | ❌ | salary only | dept | own |
| employees:delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| attendance:read | ✅ | ✅ | ❌ | ❌ | dept | own |
| attendance:manage | ✅ | ✅ | ❌ | ❌ | dept | ❌ |
| leave:approve | ✅ | ✅ | ❌ | ❌ | dept | ❌ |
| leave:request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| payroll:run | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| payroll:read | ✅ | ❌ | ❌ | ✅ | ❌ | own payslip |
| payroll:approve | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| recruitment:manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| training:manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| performance:manage | ✅ | ✅ | ❌ | ❌ | dept | own |
| reports:export | ✅ | dept | ❌ | payroll | dept | ❌ |

---

## 9. Permission Check Algorithm

The system evaluates permissions in this order on every request:

```
1. Is the user a super_admin? → ALLOW (bypass all checks)
2. Is the user's account active? → If not, DENY
3. Is the tenant active (not suspended)? → If not, DENY
4. Is the module enabled for this tenant? → If not, DENY (feature flag)
5. Collect all roles for this user in the current company/branch context
6. Check user-level permission overrides (explicit DENY beats everything)
7. Check if any role grants the required permission with sufficient scope
8. If ALLOW: Does the scope restrict which records are visible?
   → Apply scope filter to the database query
9. Log permission check to performance metrics (not audit log — too verbose)
```

### Permission Override Priority (Highest to Lowest)

```
1. User-level DENY override       (explicit block)
2. User-level ALLOW override      (explicit grant)
3. Role-level permission          (standard)
4. Default DENY                   (if no permission found)
```

---

## 10. Organization Hierarchy & Data Scoping

```
Tenant
├── Company
│   ├── Branch
│   │   ├── Department
│   │   │   └── Team
│   │   │       └── User
```

When a user has `scope: department` on a permission, the query becomes:
```sql
WHERE tenant_id = :tenant_id
  AND department_id IN (
    SELECT id FROM core_departments
    WHERE id = :user_department_id
    OR parent_id = :user_department_id  -- include sub-departments
  )
  AND deleted_at IS NULL
```

When a user has `scope: branch`:
```sql
WHERE tenant_id = :tenant_id
  AND branch_id = :user_branch_id
  AND deleted_at IS NULL
```

---

## 11. Audit Policy

**Everything that changes state is audited.** No exceptions.

Every write operation (create/update/delete/approve/reject) triggers an audit entry:

```typescript
await audit.log({
  action: 'hr.employee.salary_updated',
  module: 'hr',
  entity_type: 'hr_employees',
  entity_id: employee.id,
  old_values: { basic_salary: 5000 },
  new_values: { basic_salary: 5500 },
});
```

### High-Priority Audit Events (Always Captured, Never Skipped)

```
auth.user.login
auth.user.login_failed
auth.user.logout
auth.user.mfa_enabled
auth.session.revoked
auth.password.changed
admin.role.assigned
admin.role.revoked
admin.permission.override_added
hr.employee.created
hr.employee.terminated
hr.salary.updated
hr.payroll.run_started
hr.payroll.run_approved
finance.invoice.approved
finance.payment.recorded
finance.journal_entry.posted
inventory.stock.adjusted
procurement.po.approved
documents.contract.signed
admin.settings.changed
admin.branding.changed
security.user.suspended
security.api_key.created
security.api_key.revoked
```

---

## 12. Device & Session Management

Users can manage their active sessions from **Settings → Security → Active Sessions**:

| Feature | Detail |
|---|---|
| View all sessions | Device name, IP, last active, location |
| Revoke a session | Immediately invalidates the refresh token |
| Revoke all other sessions | Keeps current session, revokes all others |
| Trusted devices | Skip MFA on trusted devices for 30 days |
| Suspicious login alert | Email notification on new device/location |

---

## 13. White-Label Identity

Each tenant can configure:
- Custom login page with their logo and brand colors
- Custom `app_name` (e.g., "Acme Portal" instead of "Reno System")
- Custom email templates for welcome, password reset, MFA
- Custom domain (e.g., `hr.acme.com` → maps to their tenant)
- SSO integration (SAML 2.0 / OAuth2 / OIDC) — future phase

---

**AWAITING OWNER APPROVAL BEFORE PROCEEDING TO DOCUMENT 4**
