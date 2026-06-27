# Reno System — Architecture Diagrams v1.0.0

---

## 1. Enterprise System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            RENO ENTERPRISE v1.0.0                               │
│                          Business Operating System                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS / CONSUMERS                                 │
│                                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│   │  Web Browser │    │ Mobile App   │    │  Third-Party  │    │  CLI Tool    │ │
│   │ (Next.js 15) │    │  (Flutter)   │    │  Integrations │    │ (@reno/cli)  │ │
│   │  iOS/Android │    │  iOS/Android │    │  Webhooks/SDK │    │              │ │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
└──────────┼────────────────────┼────────────────────┼────────────────────┼────────┘
           │ HTTPS              │ HTTPS              │ HTTPS              │
           └────────────────────┴────────────────────┴────────────────────┘
                                          │
                              ┌───────────┴───────────┐
                              │    Load Balancer       │
                              │  (nginx / AWS ALB)     │
                              │   TLS Termination      │
                              └───────────┬────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                      │
          ┌─────────┴────────┐  ┌────────┴─────────┐  ┌────────┴─────────┐
          │  Web Frontend    │  │   REST API        │  │  OpenAPI Docs    │
          │  (Next.js 15)    │  │  (Fastify)        │  │  /docs           │
          │  Port 3000       │  │  Port 4000        │  │  Port 4000/docs  │
          └──────────────────┘  └────────┬──────────┘  └──────────────────┘
                                         │
                    ┌────────────────────┬┴───────────────────────┐
                    │                    │                         │
          ┌─────────┴────────┐  ┌────────┴─────────┐  ┌──────────┴────────┐
          │  Auth Middleware  │  │  Business Logic   │  │  AI / Brain       │
          │  JWT + 2FA        │  │  Services         │  │  Services         │
          │  RBAC             │  │  (30 modules)     │  │  (9 AI services)  │
          └──────────────────┘  └────────┬──────────┘  └──────────┬────────┘
                                         │                         │
                    ┌────────────────────┴─────────────────────────┘
                    │
          ┌─────────┴────────────────────────────────────────────┐
          │                   DATA LAYER                          │
          │                                                       │
          │  ┌───────────────┐  ┌───────────┐  ┌─────────────┐  │
          │  │  PostgreSQL   │  │  Redis    │  │  S3 Storage │  │
          │  │  (Prisma ORM) │  │  (Cache)  │  │  (Backups)  │  │
          │  │  247 Models   │  │  Sessions │  │  Documents  │  │
          │  │  26 Migrations│  │  Queues   │  │             │  │
          │  └───────────────┘  └───────────┘  └─────────────┘  │
          └──────────────────────────────────────────────────────┘
                    │
          ┌─────────┴────────────────────────────────────────────┐
          │                   EXTERNAL SERVICES                   │
          │                                                       │
          │  ┌───────────────┐  ┌───────────┐  ┌─────────────┐  │
          │  │  OpenAI /     │  │  SMTP     │  │  Monitoring │  │
          │  │  Anthropic    │  │  (Email)  │  │  Prometheus │  │
          │  │  (AI Models)  │  │           │  │  Grafana    │  │
          │  └───────────────┘  └───────────┘  └─────────────┘  │
          └──────────────────────────────────────────────────────┘
```

---

## 2. Module Dependency Map

```
CORE PLATFORM (foundation — required by all modules)
├── Multi-Tenant (CoreTenant, CoreUser, CoreSession)
├── Auth (JWT, 2FA, RBAC, Permissions)
├── Audit (SysAuditLog — every module writes here)
└── Notifications (SysNotification — every module uses)

BUSINESS MODULES (depend on Core Platform)
├── HR ──────────────────────────────────────────────────────┐
│   ├── Employee, Leave, Payroll, Performance, OrgChart      │
│   └── Used by: Projects, Finance, Portals                  │
│                                                            │
├── CRM ─────────────────────────────────────────────────────┤
│   ├── Contact, Company, Opportunity, Pipeline, Activity    │
│   └── Used by: Sales, Finance, Communications, Brain       │
│                                                            │
├── Sales ───────────────────────────────────────────────────┤
│   ├── Quotation, Order, Invoice, Payment, Subscription     │
│   └── Depends on: CRM (customer), Inventory (products)    │
│                                                            │
├── Finance ─────────────────────────────────────────────────┤
│   ├── Journal, Account, Budget, Bank, Reconciliation       │
│   └── Depends on: Sales (invoices), HR (payroll)          │
│                                                            │
├── Inventory ───────────────────────────────────────────────┤
│   ├── Warehouse, Product, Movement, StockAlert             │
│   └── Used by: Sales, Manufacturing, Procurement           │
│                                                            │
├── Projects ────────────────────────────────────────────────┤
│   ├── Project, Task, Milestone, Board, TimeLog             │
│   └── Depends on: HR (employees), Finance (budget)        │
│                                                            │
├── Procurement ─────────────────────────────────────────────┤
│   ├── RFQ, PurchaseOrder, Supplier, Approval               │
│   └── Depends on: Inventory (stock), Finance (budget)     │
│                                                            │
└── Manufacturing ───────────────────────────────────────────┘
    ├── BOM, WorkCenter, ProductionOrder, QualityCheck, MRP
    └── Depends on: Inventory (materials), Procurement (supply)

KNOWLEDGE & SUPPORT (depend on Core + Business Modules)
├── Knowledge Base — depends on: nothing (standalone)
├── Helpdesk (SLA) — depends on: CRM (contacts), KB (articles)
└── Communications — depends on: CRM (contacts), Helpdesk (tickets)

PLATFORM & PORTALS (depends on all business modules)
├── Customer Portal — depends on: CRM, Sales, Helpdesk
├── Employee Portal — depends on: HR
├── Mobile App — depends on: all modules (API consumer)
├── Marketplace — depends on: Inventory, Sales
└── Automation — depends on: all modules (trigger consumer)

INTELLIGENCE & AI LAYER (depends on all modules for data)
├── Analytics & BI — reads from all modules
├── Reno Brain (Core) — orchestrates all AI
│   ├── Recommendations — reads all modules
│   ├── Actions — writes to all modules (with approval)
│   ├── Executive Reports — reads all modules
│   └── AI SRE — monitors all services
├── Brain Memory Engine — stores cross-module knowledge
├── Brain Learning Loop — improves from feedback
├── Daily Briefing — reads all operational modules
├── Board Simulator — reads recommendations + predictions
└── Semantic Search — indexes knowledge across all content

INFRASTRUCTURE LAYER
├── Observability (Prometheus, Grafana, tracing)
├── Backup Management (PostgreSQL dumps, S3)
├── Disaster Recovery (playbooks, RTO/RPO tracking)
├── CI/CD Pipeline (GitHub Actions, Docker, Kubernetes)
└── Developer Platform (SDK, Plugin SDK, CLI, Webhooks)
```

---

## 3. Deployment Architecture (Production)

```
                    ┌──────────────────────────────┐
                    │       DNS / CDN               │
                    │  app.yourdomain.com           │
                    │  api.yourdomain.com           │
                    └──────────────┬───────────────┘
                                   │ HTTPS
                    ┌──────────────▼───────────────┐
                    │       Load Balancer           │
                    │    (AWS ALB / nginx)          │
                    │    TLS + WAF + DDoS           │
                    └──────┬──────────────┬─────────┘
                           │              │
               ┌───────────▼──┐    ┌──────▼──────────┐
               │  Web Pods    │    │  API Pods         │
               │  (Next.js)   │    │  (Fastify)        │
               │  x3 replicas │    │  x3 replicas      │
               └──────────────┘    └──────┬────────────┘
                                          │
                    ┌─────────────────────▼──────────────────────┐
                    │           Kubernetes Cluster                 │
                    │                                              │
                    │  ┌──────────────┐    ┌──────────────┐      │
                    │  │  PostgreSQL  │    │  Redis       │      │
                    │  │  StatefulSet │    │  StatefulSet │      │
                    │  │  Primary +   │    │  Cluster     │      │
                    │  │  Replica     │    │              │      │
                    │  └──────────────┘    └──────────────┘      │
                    │                                              │
                    │  ┌──────────────┐    ┌──────────────┐      │
                    │  │  Prometheus  │    │  Grafana     │      │
                    │  │  (metrics)   │    │  (dashboards)│      │
                    │  └──────────────┘    └──────────────┘      │
                    │                                              │
                    └──────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────▼──────────────────────┐
                    │              AWS (External)                  │
                    │  ┌──────────────┐    ┌──────────────┐      │
                    │  │  S3 Bucket   │    │  SES (Email) │      │
                    │  │  (Backups +  │    │              │      │
                    │  │   Documents) │    │              │      │
                    │  └──────────────┘    └──────────────┘      │
                    └──────────────────────────────────────────────┘
```

---

## 4. AI Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     RENO BRAIN v1.0                               │
│                    AI Intelligence Layer                          │
└──────────────────────────────────────────────────────────────────┘

DATA SOURCES (real Prisma queries — no fake data)
┌─────────────────────────────────────────────────────────────────┐
│  sdTicket  salesInvoice  pmProject  crmOpportunity  brainAction  │
│  hrEmployee  aiExecRecommendation  aiBizPrediction  aiLessonLearned │
└────────────────────────────────┬────────────────────────────────┘
                                  │ real data
                     ┌────────────▼────────────────┐
                     │     AI Services Layer        │
                     │                              │
                     │  ┌─────────────────────┐    │
                     │  │  Daily Briefing      │    │
                     │  │  (morning summary)   │    │
                     │  └──────────────────────┘    │
                     │                              │
                     │  ┌──────────────────────┐   │
                     │  │  Recommendation      │   │
                     │  │  Engine (evidence-   │   │
                     │  │  based, confidence)  │   │
                     │  └──────────────────────┘   │
                     │                              │
                     │  ┌──────────────────────┐   │
                     │  │  Board Simulator     │   │
                     │  │  (5 CEO/CFO/COO/     │   │
                     │  │   CMO/CTO personas)  │   │
                     │  └──────────────────────┘   │
                     │                              │
                     │  ┌──────────────────────┐   │
                     │  │  Semantic Search     │   │
                     │  │  (vector embeddings) │   │
                     │  └──────────────────────┘   │
                     │                              │
                     │  ┌──────────────────────┐   │
                     │  │  Executive Reports   │   │
                     │  │  (CEO/CFO/COO/CMO/   │   │
                     │  │   CTO specific)      │   │
                     │  └──────────────────────┘   │
                     └────────────┬────────────────┘
                                  │ outputs
                     ┌────────────▼────────────────┐
                     │     LEARNING FEEDBACK LOOP   │
                     │                              │
                     │  Human Decision              │
                     │  ↓                           │
                     │  AiFeedbackLoop              │
                     │  (accepted/rejected/         │
                     │   ignored/implemented)       │
                     │  ↓                           │
                     │  AiAccuracyMetric            │
                     │  (daily/weekly/monthly)      │
                     │  ↓                           │
                     │  AiLessonLearned             │
                     │  (auto-extracted)            │
                     │  ↓                           │
                     │  AiBusinessMemory            │
                     │  (long-term context)         │
                     └─────────────────────────────┘

TENANT ISOLATION: Every model has tenantId. Every query filters by tenantId.
No cross-tenant data access is possible.

HUMAN APPROVAL: All AI actions require explicit human approval.
No action is ever auto-executed.
```

---

## 5. Data Flow — Invoice Lifecycle with AI

```
Customer Request
      │
      ▼
CRM Contact/Opportunity ──── Brain notes opportunity
      │
      ▼
Sales Quotation ──────────── Brain suggests pricing based on history
      │  (approved by user)
      ▼
Sales Order ──────────────── Brain checks inventory availability
      │
      ▼
Sales Invoice Created ─────► Brain Briefing gets updated
      │                       Brain Daily: "3 new invoices, $12,400 pending"
      ▼
Invoice Sent to Customer
      │
      ├── Paid on time ─────► Brain records positive payment pattern
      │                       AiBusinessMemory: "Customer pays within 15 days"
      │
      └── Overdue ──────────► Brain Recommendation: "Follow up with Acme Corp — invoice #INV-042 overdue by 7 days"
                               Evidence: ["Invoice created 2026-06-20", "Due 2026-06-27", "No payment recorded"]
                               Human approves/rejects recommendation
                               AiFeedbackLoop records outcome
                               AiAccuracyMetric updated
```
