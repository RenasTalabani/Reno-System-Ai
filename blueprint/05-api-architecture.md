# Reno System — Master Blueprint v1
## Document 5: API Architecture

**Project:** Reno System  
**Owner:** Renas Talabani  
**Status:** DRAFT — Awaiting Owner Approval  
**Version:** 1.0.0  
**Date:** 2026-06-22  

---

## 1. API Strategy Overview

Reno System uses a **dual API architecture**:

| API Type | Use Case | Clients |
|---|---|---|
| **GraphQL** | Internal — web and desktop app | Next.js, Electron |
| **REST** | External — mobile app, third-party integrations, partner APIs | Flutter, webhooks, SDK users |
| **WebSocket** | Real-time — chat, notifications, live updates | All clients |
| **Webhooks** | Outbound events to external systems | Third-party apps |

---

## 2. Base URLs

```
Production:
  REST:       https://api.reno-system.com/v1/
  GraphQL:    https://api.reno-system.com/graphql
  WebSocket:  wss://api.reno-system.com/ws
  Webhooks:   Configured per tenant (outbound)

Self-hosted:
  REST:       https://your-domain.com/api/v1/
  GraphQL:    https://your-domain.com/api/graphql

Local Development:
  REST:       http://localhost:4000/v1/
  GraphQL:    http://localhost:4000/graphql
  WebSocket:  ws://localhost:4000/ws
```

---

## 3. REST API

### 3.1 Authentication

Every REST request must include:

```http
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_uuid>
Content-Type: application/json
Accept: application/json
```

For API key clients (integrations):
```http
X-API-Key: <api_key>
X-Tenant-ID: <tenant_uuid>
```

### 3.2 Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { },
  "meta": {
    "timestamp": "2026-06-22T10:00:00Z",
    "version": "1.0.0",
    "request_id": "uuid"
  }
}
```

**List Response (with pagination):**
```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "pagination": {
      "total": 1250,
      "page": 1,
      "per_page": 50,
      "total_pages": 25,
      "next_cursor": "eyJpZCI6Ijg3NiJ9",
      "prev_cursor": null
    },
    "timestamp": "2026-06-22T10:00:00Z",
    "request_id": "uuid"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "phone", "message": "Phone is required" }
    ]
  },
  "meta": {
    "timestamp": "2026-06-22T10:00:00Z",
    "request_id": "uuid"
  }
}
```

### 3.3 HTTP Status Codes

| Code | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (new resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist or was deleted |
| 409 | Conflict | Duplicate resource, version conflict |
| 422 | Unprocessable Entity | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Maintenance or overload |

### 3.4 Error Codes (Application-Level)

```
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
AUTH_TOKEN_INVALID
AUTH_MFA_REQUIRED
AUTH_ACCOUNT_SUSPENDED
AUTH_TENANT_SUSPENDED

VALIDATION_ERROR
VALIDATION_REQUIRED_FIELD
VALIDATION_INVALID_FORMAT

PERMISSION_DENIED
PERMISSION_SCOPE_INSUFFICIENT

RESOURCE_NOT_FOUND
RESOURCE_ALREADY_EXISTS
RESOURCE_SOFT_DELETED

BUSINESS_RULE_VIOLATION
BUSINESS_INSUFFICIENT_STOCK
BUSINESS_PAYROLL_ALREADY_RUN
BUSINESS_LEAVE_BALANCE_EXCEEDED
BUSINESS_BUDGET_EXCEEDED

RATE_LIMIT_EXCEEDED
MODULE_NOT_ENABLED
TENANT_PLAN_LIMIT_REACHED

SERVER_ERROR
```

### 3.5 Filtering, Sorting, Pagination

```http
# Filtering
GET /v1/hr/employees?filter[status]=active&filter[department_id]=uuid&filter[branch_id]=uuid

# Date range filtering
GET /v1/finance/invoices?filter[created_at][gte]=2026-01-01&filter[created_at][lte]=2026-06-30

# Sorting (prefix - for descending)
GET /v1/hr/employees?sort=-created_at,last_name

# Pagination (cursor-based — default)
GET /v1/hr/employees?cursor=eyJpZCI6Ijg3NiJ9&limit=50

# Pagination (page-based — for reports/exports)
GET /v1/reports/payroll?page=2&per_page=100

# Search
GET /v1/crm/contacts?search=john&search_fields=first_name,last_name,email

# Include related records
GET /v1/hr/employees?include=department,team,roles
```

### 3.6 REST Endpoint Catalog

#### Auth Endpoints

```
POST   /v1/auth/login
POST   /v1/auth/logout
POST   /v1/auth/refresh
POST   /v1/auth/mfa/setup
POST   /v1/auth/mfa/verify
POST   /v1/auth/mfa/disable
POST   /v1/auth/password/forgot
POST   /v1/auth/password/reset
POST   /v1/auth/password/change
GET    /v1/auth/sessions
DELETE /v1/auth/sessions/:id
DELETE /v1/auth/sessions            (revoke all)
```

#### Core — Users

```
GET    /v1/users
POST   /v1/users
GET    /v1/users/:id
PUT    /v1/users/:id
PATCH  /v1/users/:id/status
DELETE /v1/users/:id
POST   /v1/users/:id/roles
DELETE /v1/users/:id/roles/:role_id
GET    /v1/users/me
PUT    /v1/users/me/profile
GET    /v1/users/me/notifications
PATCH  /v1/users/me/notifications/:id/read
POST   /v1/users/invite
```

#### Core — Org Structure

```
GET    /v1/companies
POST   /v1/companies
GET    /v1/companies/:id
PUT    /v1/companies/:id
GET    /v1/branches
POST   /v1/branches
GET    /v1/branches/:id
PUT    /v1/branches/:id
GET    /v1/departments
POST   /v1/departments
GET    /v1/departments/:id
PUT    /v1/departments/:id
GET    /v1/teams
POST   /v1/teams
GET    /v1/teams/:id
PUT    /v1/teams/:id
```

#### Core — Roles & Permissions

```
GET    /v1/roles
POST   /v1/roles
GET    /v1/roles/:id
PUT    /v1/roles/:id
DELETE /v1/roles/:id
GET    /v1/roles/:id/permissions
PUT    /v1/roles/:id/permissions
GET    /v1/permissions
```

#### HR Endpoints

```
GET    /v1/hr/employees
POST   /v1/hr/employees
GET    /v1/hr/employees/:id
PUT    /v1/hr/employees/:id
PATCH  /v1/hr/employees/:id/status
GET    /v1/hr/employees/:id/documents
GET    /v1/hr/employees/:id/attendance
GET    /v1/hr/employees/:id/leaves
GET    /v1/hr/employees/:id/payslips
GET    /v1/hr/attendance
POST   /v1/hr/attendance/check-in
POST   /v1/hr/attendance/check-out
GET    /v1/hr/leave-types
POST   /v1/hr/leave-types
GET    /v1/hr/leaves
POST   /v1/hr/leaves
GET    /v1/hr/leaves/:id
PATCH  /v1/hr/leaves/:id/approve
PATCH  /v1/hr/leaves/:id/reject
GET    /v1/hr/payroll/periods
POST   /v1/hr/payroll/runs
GET    /v1/hr/payroll/runs/:id
PATCH  /v1/hr/payroll/runs/:id/approve
GET    /v1/hr/payroll/runs/:id/payslips
GET    /v1/hr/recruitment/jobs
POST   /v1/hr/recruitment/jobs
GET    /v1/hr/recruitment/jobs/:id/applications
POST   /v1/hr/recruitment/jobs/:id/applications
```

#### CRM Endpoints

```
GET    /v1/crm/leads
POST   /v1/crm/leads
GET    /v1/crm/leads/:id
PUT    /v1/crm/leads/:id
PATCH  /v1/crm/leads/:id/convert
DELETE /v1/crm/leads/:id
GET    /v1/crm/contacts
POST   /v1/crm/contacts
GET    /v1/crm/contacts/:id
PUT    /v1/crm/contacts/:id
GET    /v1/crm/companies
POST   /v1/crm/companies
GET    /v1/crm/opportunities
POST   /v1/crm/opportunities
GET    /v1/crm/opportunities/:id
PUT    /v1/crm/opportunities/:id
PATCH  /v1/crm/opportunities/:id/stage
POST   /v1/crm/activities
GET    /v1/crm/activities
GET    /v1/crm/pipeline
```

#### Projects Endpoints

```
GET    /v1/projects
POST   /v1/projects
GET    /v1/projects/:id
PUT    /v1/projects/:id
DELETE /v1/projects/:id
GET    /v1/projects/:id/tasks
POST   /v1/projects/:id/tasks
GET    /v1/projects/:id/milestones
GET    /v1/projects/:id/members
POST   /v1/projects/:id/members
GET    /v1/tasks/:id
PUT    /v1/tasks/:id
PATCH  /v1/tasks/:id/status
DELETE /v1/tasks/:id
POST   /v1/tasks/:id/time-logs
GET    /v1/tasks/:id/comments
POST   /v1/tasks/:id/comments
```

#### Sales Endpoints

```
GET    /v1/sales/quotes
POST   /v1/sales/quotes
GET    /v1/sales/quotes/:id
PUT    /v1/sales/quotes/:id
PATCH  /v1/sales/quotes/:id/send
PATCH  /v1/sales/quotes/:id/convert
GET    /v1/sales/orders
POST   /v1/sales/orders
GET    /v1/sales/invoices
POST   /v1/sales/invoices
GET    /v1/sales/invoices/:id
PATCH  /v1/sales/invoices/:id/approve
PATCH  /v1/sales/invoices/:id/send
POST   /v1/sales/payments
GET    /v1/sales/subscriptions
POST   /v1/sales/subscriptions
```

#### Inventory Endpoints

```
GET    /v1/inventory/products
POST   /v1/inventory/products
GET    /v1/inventory/products/:id
PUT    /v1/inventory/products/:id
GET    /v1/inventory/stock
GET    /v1/inventory/stock/:product_id
POST   /v1/inventory/adjustments
GET    /v1/inventory/movements
GET    /v1/inventory/warehouses
POST   /v1/inventory/warehouses
POST   /v1/inventory/transfers
GET    /v1/inventory/transfers/:id
```

#### Finance Endpoints

```
GET    /v1/finance/accounts
POST   /v1/finance/accounts
GET    /v1/finance/journal-entries
POST   /v1/finance/journal-entries
GET    /v1/finance/reports/profit-loss
GET    /v1/finance/reports/balance-sheet
GET    /v1/finance/reports/cash-flow
GET    /v1/finance/budgets
POST   /v1/finance/budgets
GET    /v1/finance/bank-accounts
POST   /v1/finance/bank-accounts
GET    /v1/finance/bank-accounts/:id/transactions
POST   /v1/finance/bank-accounts/:id/reconcile
```

#### System Endpoints

```
GET    /v1/audit-logs
GET    /v1/settings
PUT    /v1/settings/:key
GET    /v1/branding
PUT    /v1/branding
GET    /v1/feature-flags
PATCH  /v1/feature-flags/:module/:feature
GET    /v1/webhooks
POST   /v1/webhooks
DELETE /v1/webhooks/:id
GET    /v1/api-keys
POST   /v1/api-keys
DELETE /v1/api-keys/:id
```

---

## 4. GraphQL API

### 4.1 Schema Organization

```graphql
# Root types
type Query { ... }
type Mutation { ... }
type Subscription { ... }

# Per-module extension
extend type Query {
  # HR
  employees(filter: EmployeeFilter, pagination: PaginationInput): EmployeeConnection!
  employee(id: ID!): Employee
  
  # CRM
  leads(filter: LeadFilter, pagination: PaginationInput): LeadConnection!
  
  # etc.
}
```

### 4.2 Standard Types

```graphql
# Pagination
input PaginationInput {
  cursor: String
  limit: Int = 50
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
  total: Int!
}

# Every list query uses a Connection pattern
type EmployeeConnection {
  nodes: [Employee!]!
  pageInfo: PageInfo!
}

# Standard audit fields on every type
interface Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User
  isActive: Boolean!
}
```

### 4.3 Example Queries

```graphql
# Dashboard data in one query — no REST over-fetching
query ExecutiveDashboard {
  hrMetrics {
    totalEmployees
    newHiresThisMonth
    attendanceRateToday
    openLeaveRequests
  }
  salesMetrics {
    revenueThisMonth
    openOpportunities
    overdueInvoices { count value }
  }
  projectMetrics {
    activeProjects
    tasksOverdue
    teamUtilization
  }
}

# Employee with all relations in one query
query EmployeeDetail($id: ID!) {
  employee(id: $id) {
    id
    fullName
    jobTitle
    department { name }
    team { name }
    attendance(last: 30) { date status hoursWorked }
    leaveBalance { type remaining }
    payslips(last: 3) { period netPay status }
    performance { rating goals { title status } }
  }
}
```

### 4.4 Subscriptions (Real-Time)

```graphql
# Notification stream
subscription OnNotification($userId: ID!) {
  notification(userId: $userId) {
    id
    type
    title
    body
    data
  }
}

# Task updates for project collaboration
subscription OnTaskUpdate($projectId: ID!) {
  taskUpdated(projectId: $projectId) {
    id
    title
    status
    assignee { fullName avatarUrl }
  }
}

# Live chat messages
subscription OnMessage($channelId: ID!) {
  messageReceived(channelId: $channelId) {
    id
    body
    sender { fullName avatarUrl }
    sentAt
  }
}
```

---

## 5. WebSocket Protocol

### 5.1 Connection

```javascript
// Client connects with JWT
const socket = io('wss://api.reno-system.com', {
  auth: { token: accessToken },
  query: { tenant_id: tenantId }
});
```

### 5.2 Namespaces

```
/notifications    — User notification delivery
/chat             — Real-time messaging
/presence         — Online/offline status
/collaboration    — Live document editing, task updates
/activity         — Live activity feed
```

### 5.3 Standard Event Structure

```json
{
  "event": "notification.new",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "payload": { },
  "timestamp": "2026-06-22T10:00:00Z",
  "id": "uuid"
}
```

---

## 6. Webhook System

### 6.1 Webhook Configuration

Tenants configure webhooks from Settings → Integrations → Webhooks:
- Endpoint URL
- Secret (for HMAC signature verification)
- Events to subscribe to
- Active/inactive toggle
- Retry policy

### 6.2 Delivery

```http
POST https://customer-endpoint.com/webhook
Content-Type: application/json
X-Reno-Signature: sha256=<hmac>
X-Reno-Event: hr.employee.created
X-Reno-Delivery: <delivery-uuid>
X-Reno-Timestamp: 1750000000

{
  "event": "hr.employee.created",
  "tenant_id": "uuid",
  "occurred_at": "2026-06-22T10:00:00Z",
  "data": { ... }
}
```

### 6.3 Webhook Event Catalog

```
auth.*
  auth.user.login
  auth.user.login_failed

hr.*
  hr.employee.created
  hr.employee.updated
  hr.employee.terminated
  hr.leave.requested
  hr.leave.approved
  hr.leave.rejected
  hr.payroll.completed

crm.*
  crm.lead.created
  crm.opportunity.won
  crm.opportunity.lost
  crm.contact.created

sales.*
  sales.quote.sent
  sales.order.confirmed
  sales.invoice.issued
  sales.invoice.paid
  sales.payment.received

inventory.*
  inventory.stock.low
  inventory.stock.adjusted
  inventory.transfer.completed

finance.*
  finance.invoice.approved
  finance.payment.recorded
  finance.budget.exceeded

documents.*
  documents.signature.completed
  documents.approval.completed

projects.*
  projects.project.created
  projects.task.completed
  projects.milestone.reached

service.*
  service.ticket.created
  service.ticket.resolved
  service.sla.breached
```

### 6.4 Retry Policy

```
Attempt 1:  Immediately
Attempt 2:  5 minutes later
Attempt 3:  30 minutes later
Attempt 4:  2 hours later
Attempt 5:  12 hours later

After 5 failures: Mark as failed, notify tenant admin.
Success: HTTP 2xx response within 10 seconds.
```

---

## 7. Rate Limiting

| Client Type | Limit |
|---|---|
| Authenticated user (SaaS) | 1,000 requests / 15 minutes |
| API key (integration) | 5,000 requests / 15 minutes |
| Enterprise plan | 20,000 requests / 15 minutes |
| Unauthenticated | 20 requests / minute (auth endpoints only) |

Rate limit headers returned on every response:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1750000900
```

---

## 8. API Versioning

```
URL-based versioning:
  /v1/...    Current stable API
  /v2/...    Next major version (when breaking changes are needed)

Version lifecycle:
  - New major version announced 6 months before v(n-1) deprecation
  - v(n-1) supported for 12 months after v(n) release
  - Breaking changes NEVER happen within a major version
  - Additive changes (new fields, new endpoints) are non-breaking
```

---

## 9. API Security

| Layer | Implementation |
|---|---|
| Transport | TLS 1.3 required — HTTP rejected |
| Authentication | RS256 JWT (15 min) + opaque refresh token (7d) |
| API Keys | SHA-256 hashed in database, never stored plain |
| Webhook Signatures | HMAC-SHA256 with tenant-specific secret |
| Input Validation | Zod schemas on 100% of inputs before business logic |
| SQL Injection | Prisma parameterized queries only — raw SQL forbidden |
| CORS | Allowlist per tenant custom domain + reno-system.com |
| Rate Limiting | Redis sliding window counter per tenant+user |
| Request Size | Max 10MB body, 100MB file upload |
| GraphQL | Depth limit 7, complexity limit 1000, introspection off in prod |

---

## 10. API Documentation

- **REST:** Auto-generated OpenAPI 3.0 spec from code annotations → Swagger UI at `/docs`
- **GraphQL:** GraphQL Playground in development, schema file in production
- **Webhooks:** Documented in developer portal
- **SDKs:** TypeScript SDK auto-generated from OpenAPI spec (Phase 12)

---

**AWAITING OWNER APPROVAL BEFORE PROCEEDING TO DOCUMENT 6**
