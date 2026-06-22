# Reno System — Master Blueprint v1
## Document 1: System Architecture

**Project:** Reno System  
**Owner:** Renas Talabani  
**Status:** DRAFT — Awaiting Owner Approval  
**Version:** 1.0.0  
**Date:** 2026-06-22  

---

## 1. Executive Summary

Reno System is an AI-first Business Operating System (BOS) designed to run any company, in any industry, on any device. It is not an application — it is a platform capable of serving thousands of organizations simultaneously through a multi-tenant SaaS model while also supporting on-premise and hybrid deployments for enterprise and government clients.

The architecture is designed to:
- Launch fast as a Modular Monolith
- Scale into Microservices as demand requires
- Support every deployment target from day one at the infrastructure level
- Never lock a tenant to a specific data isolation tier — they can migrate up

---

## 2. Core Principles (Non-Negotiable)

| Principle | Meaning |
|---|---|
| **Platform First** | Every decision must serve thousands of companies, not one |
| **AI First** | AI is not a feature layer — it is woven into every module |
| **Mobile First** | UI decisions start from the smallest screen |
| **Enterprise Grade** | Security, audit, multi-tenancy, and performance are never optional |
| **Future Proof** | Architecture must support features not yet designed |
| **Modular** | Every module is independently deployable and replaceable |
| **White Label Ready** | Any tenant can fully brand their instance |
| **Marketplace Ready** | Third parties can extend the platform via plugins, themes, agents |

---

## 3. Platform Targets

| Platform | Technology | Deployment |
|---|---|---|
| Web App | Next.js 14+ (App Router) | SaaS, Self-hosted |
| Desktop — Windows | Electron + Next.js | Packaged installer |
| Desktop — macOS | Electron + Next.js | Packaged installer |
| Desktop — Linux | Electron + Next.js | Packaged installer |
| Mobile — Android | Flutter | Google Play / APK |
| Mobile — iOS | Flutter | App Store |
| Tablet — Android/iOS | Flutter (responsive) | Same as mobile |

---

## 4. Confirmed Technology Stack

### 4.1 Core Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14+ (TypeScript) | App Router, SSR/SSG, API Routes, best-in-class React ecosystem |
| **Mobile** | Flutter 3+ (Dart) | Single codebase for iOS + Android + Tablet, native performance |
| **Desktop** | Electron (wraps Next.js) | Reuses web codebase, cross-platform, offline-capable |
| **Backend** | Node.js + TypeScript | Type-safe, async-native, huge ecosystem, matches frontend language |
| **ORM** | Prisma | Type-safe DB access, migration management, schema-first |
| **Database** | PostgreSQL 15+ | ACID, JSONB, Row Level Security, full-text search, proven at scale |
| **Cache** | Redis 7+ | Session store, event pub/sub, job queues, real-time counters |
| **Storage** | S3-Compatible (MinIO / AWS S3 / Cloudflare R2) | Documents, media, exports, backups |
| **Containers** | Docker | Local dev, CI/CD, packaging |
| **Orchestration** | Kubernetes | Production scaling, service mesh, rolling deploys |

### 4.2 Supporting Infrastructure

| Component | Technology |
|---|---|
| API Gateway | Kong / AWS API Gateway |
| Message Queue | Redis Pub/Sub → Kafka (when needed) |
| Search | PostgreSQL Full-Text → Elasticsearch (when needed) |
| Email | SMTP / SendGrid / SES |
| SMS / Push | Twilio / Firebase Cloud Messaging |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | Loki / ELK Stack |
| Tracing | OpenTelemetry + Jaeger |
| Secret Management | HashiCorp Vault / AWS Secrets Manager |

---

## 5. Monorepo Structure

The entire Reno System is one monorepo managed with **pnpm workspaces** and **Turborepo**.

```
reno-system/
│
├── apps/
│   ├── web/                        # Next.js — Web Application
│   ├── desktop/                    # Electron — Desktop Wrapper
│   ├── mobile/                     # Flutter — iOS/Android/Tablet
│   └── api/                        # Node.js — Backend API Server
│
├── modules/                        # Business Domain Modules
│   ├── identity/                   # Auth, Users, Roles, Permissions
│   ├── hr/                         # HR, Attendance, Payroll, etc.
│   ├── crm/                        # Leads, Customers, Opportunities
│   ├── projects/                   # Projects, Tasks, Kanban, Gantt
│   ├── sales/                      # Quotes, Orders, Invoices
│   ├── procurement/                # Suppliers, POs, Receiving
│   ├── inventory/                  # Products, Warehouses, Stock
│   ├── finance/                    # Accounting, Ledger, Reports
│   ├── documents/                  # Doc Center, OCR, Signatures
│   ├── assets/                     # Vehicles, Equipment, Maintenance
│   ├── service-desk/               # Tickets, SLA, Knowledge Base
│   ├── communication/              # Chat, Voice, Video, Announcements
│   ├── bi/                         # Dashboards, Reports, Forecasts
│   ├── automation/                 # Workflow Engine, IFTTT, Triggers
│   └── ai/                         # Reno Brain, Agents, NL Queries
│
├── packages/                       # Shared Internal Packages
│   ├── core/                       # Types, constants, utilities
│   ├── database/                   # Prisma schema, seed, migrations
│   ├── ui/                         # Shared React component library
│   ├── auth/                       # JWT, session, MFA utilities
│   ├── events/                     # Event bus, event types
│   ├── config/                     # Environment config, feature flags
│   ├── validators/                 # Shared Zod schemas
│   └── logger/                     # Structured logging
│
├── infra/
│   ├── docker/                     # Dockerfiles, compose files
│   ├── kubernetes/                 # K8s manifests, Helm charts
│   └── terraform/                  # Cloud infrastructure as code
│
├── docs/
│   ├── blueprint/                  # This document and all blueprint docs
│   ├── api/                        # Auto-generated API docs
│   └── architecture/               # Architecture decision records (ADRs)
│
├── tools/
│   ├── scripts/                    # Build, deploy, seed scripts
│   └── generators/                 # Code generators for modules
│
├── .github/
│   └── workflows/                  # CI/CD pipelines
│
├── turbo.json                      # Turborepo config
├── pnpm-workspace.yaml             # Workspace definition
├── package.json                    # Root package.json
└── docker-compose.yml              # Local development stack
```

---

## 6. Backend Architecture — Modular Monolith → Microservices

### 6.1 Phase 1: Modular Monolith (Phases 0–8)

All modules run in one Node.js process but are fully isolated from each other through strict internal contracts. No module directly imports another module's internal code — cross-module communication uses the event bus or explicit service interfaces.

```
apps/api/
├── src/
│   ├── server.ts                   # Express/Fastify entry point
│   ├── graphql/                    # Apollo Server setup
│   │   ├── schema.ts               # Merged schema from all modules
│   │   └── context.ts              # Request context (tenant, user, etc.)
│   ├── rest/                       # REST API setup
│   │   ├── router.ts               # Merged router from all modules
│   │   └── middleware/             # Auth, rate limit, tenant inject
│   ├── module-loader.ts            # Dynamically loads enabled modules
│   └── bootstrap.ts                # App startup sequence
```

### 6.2 Module Internal Structure (Standard for Every Module)

Every module follows this exact pattern. No exceptions.

```
modules/[module-name]/
├── index.ts                        # Public API — only this is importable by others
├── [module].module.ts              # Module definition + dependency list
├── routes/
│   ├── [module].rest.routes.ts     # REST endpoints (external API)
│   └── [module].graphql.resolvers.ts  # GraphQL resolvers (internal)
├── services/
│   └── [module].service.ts         # Business logic (pure, testable)
├── repositories/
│   └── [module].repository.ts      # Prisma data access only
├── events/
│   ├── [module].events.ts          # Event definitions this module emits
│   └── [module].handlers.ts        # Events this module listens to
├── validators/
│   └── [module].validators.ts      # Zod input validation schemas
├── types/
│   └── [module].types.ts           # TypeScript types for this module
└── __tests__/
    ├── [module].service.spec.ts
    └── [module].repository.spec.ts
```

### 6.3 Cross-Module Communication Rules

| Communication Type | Method | Example |
|---|---|---|
| Read another module's public data | Import from `module/index.ts` only | HR reading a user's department |
| React to another module's change | Event bus subscription | Finance reacting to Payroll run completion |
| Trigger an action in another module | Event bus emission | CRM emitting "opportunity.won" → Sales creates Order |
| Query across modules at API level | GraphQL federation (later) | Dashboard querying HR + Finance data |

### 6.4 Phase 2: Microservices Path (Phase 9+)

When a module needs to scale independently (e.g., AI processing, file/OCR, real-time chat), it is extracted to its own service with:
- Its own Docker container
- Its own database schema (or separate DB)
- Communication via message queue (Kafka) instead of in-process event bus
- API Gateway routes traffic to the correct service

No code rewrite required — the module structure is already designed for extraction.

---

## 7. API Architecture

### 7.1 Dual API Strategy

```
External Clients (Mobile, Third-party, Webhooks)
    → REST API  (api.reno-system.com/v1/*)
    → OpenAPI / Swagger documented
    → API Key + JWT authenticated

Internal Clients (Next.js Web, Electron Desktop)
    → GraphQL API  (api.reno-system.com/graphql)
    → JWT authenticated
    → Schema introspection disabled in production

Real-time (Chat, Notifications, Live Updates)
    → WebSocket (Socket.io)  (api.reno-system.com/ws)
    → JWT authenticated at handshake

Outbound Events (Integrations, Automation)
    → Webhooks (configurable per tenant)
    → HMAC-signed payloads
```

### 7.2 REST API Standards

- **Base URL:** `https://api.reno-system.com/v1/`
- **Versioning:** URL-based (`/v1/`, `/v2/`)
- **Authentication:** `Authorization: Bearer <jwt>`
- **Tenant:** `X-Tenant-ID: <tenant_id>` header (or from JWT claim)
- **Pagination:** Cursor-based (`?cursor=xxx&limit=50`)
- **Filtering:** `?filter[status]=active&filter[department_id]=xxx`
- **Sorting:** `?sort=-created_at,name`
- **Response envelope:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": { "cursor": "xxx", "total": 1250 },
    "timestamp": "2026-06-22T10:00:00Z",
    "version": "1.0.0"
  },
  "errors": null
}
```

### 7.3 GraphQL API Standards

- **Endpoint:** `POST /graphql`
- **Schema:** Code-first using TypeGraphQL or Pothos
- **Authentication:** Same JWT as REST
- **Context per request:** `{ tenantId, userId, permissions, dataLoaders }`
- **N+1 prevention:** DataLoader on all relationship resolvers
- **Depth limiting:** Max query depth = 7
- **Rate limiting:** Per-tenant, per-operation

### 7.4 WebSocket Events (Real-Time)

```
Namespaces:
  /notifications     — System-wide notifications
  /chat              — Real-time messaging
  /activity          — Live activity feeds
  /collaboration     — Document co-editing, task updates
```

---

## 8. Multi-Tenancy Architecture

### 8.1 Tier Model

| Tier | Isolation | When Used | Setup |
|---|---|---|---|
| **Standard SaaS** | Row-level (tenant_id) | All SaaS customers | Automatic |
| **Enterprise** | Dedicated PostgreSQL schema | Large enterprise | Provisioned on contract |
| **Government / On-Prem** | Dedicated infrastructure | Government, high-security | Manual deployment |

### 8.2 Row-Level Isolation (Default)

Every single table in the database has `tenant_id` as a non-nullable indexed column.

PostgreSQL Row Level Security (RLS) is enabled on all tables as a defense-in-depth layer:

```sql
-- Applied to every table
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON [table_name]
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

At the application layer, every Prisma query is automatically scoped:

```typescript
// TenantPrismaClient — wraps every query
const prisma = buildTenantClient(tenantId);
// Internally adds: where: { tenant_id: tenantId }
// to every findMany, findFirst, update, delete
```

### 8.3 Tenant Resolution

```
Request arrives
  → Extract JWT → get tenant_id claim
  → OR: Extract subdomain (acme.reno-system.com → tenant: "acme")
  → OR: Extract X-Tenant-ID header (for API clients)
  → Validate tenant is active and not suspended
  → Inject tenant context into all downstream operations
```

### 8.4 Tenant Data Model

```
Tenant (one row per customer company)
  → has many Companies (Reno supports multi-company within one tenant)
    → has many Branches
      → has many Departments
        → has many Teams
          → has many Users
```

---

## 9. Database Strategy

### 9.1 Universal Row Structure

Every table without exception has these columns:

```sql
id            UUID          PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id     UUID          NOT NULL REFERENCES tenants(id)
created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
created_by    UUID          REFERENCES users(id)
updated_by    UUID          REFERENCES users(id)
deleted_at    TIMESTAMPTZ   NULL        -- NULL = active, timestamp = soft deleted
is_active     BOOLEAN       NOT NULL DEFAULT true
```

### 9.2 Soft Delete Policy

Nothing is hard-deleted. `deleted_at IS NOT NULL` means deleted.

All queries automatically filter `WHERE deleted_at IS NULL` unless explicitly querying deleted records.

### 9.3 Database Organization (Modular Monolith Mode)

All modules share one PostgreSQL database using table prefixes per module:

```
core_*        — identity, auth, roles, permissions
hr_*          — employees, attendance, payroll, leaves
crm_*         — leads, contacts, customers, opportunities
proj_*        — projects, tasks, milestones, time_logs
sales_*       — quotes, orders, invoices, subscriptions
proc_*        — suppliers, purchase_orders, receiving
inv_*         — products, warehouses, stock_movements
fin_*         — accounts, ledger_entries, budgets
doc_*         — documents, versions, signatures
asset_*       — assets, maintenance_logs
svc_*         — tickets, sla_policies, knowledge_base
comm_*        — messages, channels, meetings
ai_*          — conversations, agent_logs, predictions
sys_*         — audit_logs, notifications, settings, jobs
```

### 9.4 Migration Strategy

- **Tool:** Prisma Migrate
- **Policy:** Never edit existing migrations. New change = new migration file.
- **Naming:** `YYYYMMDDHHMMSS_description_of_change`
- **Rollback:** Every migration must have a corresponding down migration
- **Seeding:** Separate seed scripts per module for development and demo data

---

## 10. Caching Strategy

### 10.1 What Gets Cached (Redis)

| Data | TTL | Invalidation |
|---|---|---|
| User session | 24h (sliding) | On logout, password change |
| User permissions | 15min | On role/permission change |
| Tenant settings & branding | 1h | On settings update |
| Dashboard data | 5min | On underlying data change |
| Report results | 30min | On demand or data change |
| API responses (public/low-change) | 5min | Time-based |
| Lookup tables (departments, roles) | 1h | On update |

### 10.2 Cache Key Namespacing

```
reno:{tenant_id}:session:{session_id}
reno:{tenant_id}:user:{user_id}:permissions
reno:{tenant_id}:settings:branding
reno:{tenant_id}:dashboard:{dashboard_id}:user:{user_id}
```

### 10.3 Redis Additional Uses

- **Job Queue:** BullMQ for background jobs (payroll processing, report generation, AI tasks)
- **Pub/Sub:** Real-time event broadcasting between API instances
- **Rate Limiting:** Sliding window counters per tenant/user
- **Distributed Locks:** For critical operations (payroll run, inventory adjustment)

---

## 11. Storage Strategy

### 11.1 S3-Compatible Storage (MinIO / AWS S3 / Cloudflare R2)

```
Storage Buckets:
  reno-documents/       — Employee docs, contracts, invoices (private)
  reno-media/           — Profile photos, logos, banners (public)
  reno-exports/         — Generated reports, exports (private, TTL 48h)
  reno-backups/         — Database backups (private, encrypted)
  reno-ocr/             — OCR input/output staging (private, TTL 24h)
  reno-ai/              — AI training data, embeddings cache (private)
```

### 11.2 File Access Policy

- All private files are accessed via **signed URLs** (15min TTL)
- No direct bucket access ever exposed to clients
- All uploads go through the API (virus scanning → storage)
- File metadata stored in PostgreSQL; binary in S3 only

---

## 12. Event-Driven Architecture

### 12.1 Event Bus Evolution

```
Phase 0–4:   In-process Node.js EventEmitter (zero infrastructure)
Phase 5–8:   Redis Pub/Sub (multi-instance, low latency)
Phase 9+:    Apache Kafka (high-throughput, replay, audit trail)
```

### 12.2 Event Structure (Standard)

```typescript
interface RenoEvent<T = unknown> {
  id: string;               // UUID — idempotency key
  type: string;             // "hr.employee.created"
  version: string;          // "1.0"
  tenant_id: string;
  occurred_at: string;      // ISO 8601
  actor_id: string;         // User who triggered it
  payload: T;
  metadata: {
    source_module: string;
    correlation_id: string; // For tracing across events
  };
}
```

### 12.3 Event Naming Convention

```
{module}.{entity}.{action}

Examples:
  hr.employee.created
  hr.employee.terminated
  sales.invoice.paid
  inventory.stock.low_alert
  crm.opportunity.won
  finance.payroll.completed
  ai.prediction.generated
```

---

## 13. Security Architecture

### 13.1 Authentication Flow

```
1. User submits credentials
2. Server validates password (bcrypt, cost factor 12)
3. If MFA enabled → validate TOTP/SMS code
4. Issue: Access Token (JWT, 15min) + Refresh Token (opaque, 7d)
5. Access Token contains: { sub, tenant_id, role_ids, session_id }
6. Refresh Token stored in Redis (revocable)
7. All subsequent requests: Bearer <access_token>
8. Token refresh: POST /auth/refresh with refresh token cookie
```

### 13.2 Authorization Model

RBAC (Role-Based Access Control) with attribute-level permissions:

```
Role
  → has many Permissions
    → { module: "hr", resource: "employees", action: "read", scope: "own|department|all" }

User
  → belongs to one or more Roles
  → can have direct Permission overrides
  → inherits Department-level restrictions
  → inherits Branch-level restrictions
```

Permission check on every API call — no security by obscurity.

### 13.3 Security Standards

| Area | Implementation |
|---|---|
| Passwords | bcrypt, min 12 chars, complexity enforced |
| Tokens | RS256 JWT, short-lived access tokens |
| MFA | TOTP (Google Authenticator), SMS backup |
| Transport | TLS 1.3 minimum, HSTS enabled |
| Data at Rest | PostgreSQL encryption, S3 server-side encryption |
| Secrets | Never in code. HashiCorp Vault / env secrets manager |
| SQL Injection | Prisma parameterized queries only |
| XSS | Next.js built-in, CSP headers, DOMPurify for user content |
| CSRF | SameSite=Strict cookies, CSRF tokens for state changes |
| Rate Limiting | Per-IP, per-tenant, per-user at API Gateway |
| Audit Log | Every state-changing operation logged to `sys_audit_logs` |
| Input Validation | Zod schemas on 100% of API inputs |

---

## 14. Infrastructure & Deployment Architecture

### 14.1 Local Development

```yaml
# docker-compose.yml services
services:
  postgres:     image: postgres:15
  redis:        image: redis:7
  minio:        image: minio/minio        # Local S3
  mailhog:      image: mailhog/mailhog    # Local email
  adminer:      image: adminer            # DB UI
```

### 14.2 Production Kubernetes Layout

```
Namespaces:
  reno-core/          — API, Background Workers
  reno-data/          — PostgreSQL, Redis (or managed services)
  reno-infra/         — Nginx Ingress, Cert-Manager, Monitoring
  reno-ai/            — AI service, Model inference
```

### 14.3 Deployment Targets

| Target | Infrastructure | Managed By |
|---|---|---|
| SaaS (Standard) | Kubernetes (AWS/GCP/Azure) | Reno team |
| Self-Hosted (SMB) | Docker Compose | Customer IT |
| Self-Hosted (Enterprise) | Kubernetes | Customer IT + Reno support |
| Government | Air-gapped Kubernetes | Customer IT only |

### 14.4 CI/CD Pipeline (GitHub Actions)

```
Push to feature branch:
  → Lint + Type Check + Unit Tests
  → Build Docker image

Push to main:
  → All above + Integration Tests
  → Build + Push to Container Registry
  → Deploy to Staging
  → E2E Tests on Staging
  → Notify for Production approval

Production deploy (manual approval):
  → Rolling deploy to Production K8s
  → Health check verification
  → Automatic rollback on failure
```

---

## 15. Module Dependency Map (Phase 0 → All)

```
Phase 0: IDENTITY (no dependencies — built first, everything depends on it)
  ↓
Phase 1: HR (depends on: Identity)
  ↓
Phase 2: PROJECTS (depends on: Identity, HR)
  ↓
Phase 3: CRM (depends on: Identity, HR)
  ↓
Phase 4: SALES (depends on: Identity, CRM, Inventory*)
  ↓
Phase 5: INVENTORY (depends on: Identity, Procurement*)
  ↓
Phase 6: PROCUREMENT (depends on: Identity, Inventory)
  ↓
Phase 7: FINANCE (depends on: Identity, HR, Sales, Procurement, Inventory)
  ↓
Phase 8: DOCUMENTS (depends on: Identity — cross-cuts all modules)
  ↓
Phase 9: COMMUNICATION (depends on: Identity, HR)
  ↓
Phase 10: AI / RENO BRAIN (depends on: all modules — reads data from all)
  ↓
Phase 11: ANALYTICS / BI (depends on: all modules)
  ↓
Phase 12: MARKETPLACE (depends on: Identity + Plugin System)
  ↓
Phase 13: INDUSTRY PACKS (depends on: all relevant modules)
```

*Light dependency only — can be built in isolation and connected later.

---

## 16. Scalability Path

| Scale Level | Architecture | Infrastructure |
|---|---|---|
| 0–100 tenants | Modular Monolith, single DB | 1 K8s cluster, 2–4 nodes |
| 100–1,000 tenants | Modular Monolith + read replicas | 1 cluster, horizontal scaling |
| 1,000–10,000 tenants | Begin microservice extraction for AI, Files, Chat | Multi-region, CDN |
| 10,000+ tenants | Full microservices, Kafka, multi-region active-active | Global infrastructure |

The architecture is designed so that moving between these levels requires **infrastructure changes and module extraction**, not code rewrites.

---

## 17. Phase 0 Scope (What Comes Next)

Phase 0 — Reno Core — is the only phase that begins after this document is approved. It will build:

1. **Monorepo scaffold** — full project structure
2. **Identity module** — tenants, companies, branches, departments, teams, users
3. **Authentication** — login, JWT, refresh tokens, MFA framework
4. **Authorization** — RBAC system, roles, permissions engine
5. **Settings module** — tenant settings, branding, feature flags
6. **Audit log system** — infrastructure for all future audit events
7. **Notification system** — infrastructure for all future notifications
8. **API scaffold** — GraphQL + REST dual-server setup
9. **Database scaffold** — Prisma setup, base migrations, seed
10. **Docker development environment** — full local stack

---

## Document Status

| Section | Status |
|---|---|
| Core Principles | Complete |
| Platform Targets | Complete |
| Technology Stack | Complete |
| Monorepo Structure | Complete |
| Backend Architecture | Complete |
| API Architecture | Complete |
| Multi-Tenancy | Complete |
| Database Strategy | Complete |
| Caching Strategy | Complete |
| Storage Strategy | Complete |
| Event-Driven Architecture | Complete |
| Security Architecture | Complete |
| Infrastructure | Complete |
| Module Dependencies | Complete |
| Scalability Path | Complete |

---

**AWAITING OWNER APPROVAL BEFORE PROCEEDING TO DOCUMENT 2**
