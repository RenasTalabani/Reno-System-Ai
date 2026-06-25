# Reno System — Local Development Guide (Windows)

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x LTS | https://nodejs.org |
| pnpm | 11.x | `npm install -g pnpm@11` |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Flutter (optional) | 3.x | https://flutter.dev/docs/get-started/install/windows |

---

## Step 1 — Start Docker Services

Open a terminal and run:

```powershell
cd "C:\Users\Renas Talabani\Documents\Reno System Ai"
docker compose up -d
```

Wait ~15 seconds for all containers to initialize, then verify:

```powershell
docker compose ps
```

Expected: all 6 services should show `running`.

### Service URLs after Docker starts

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5433` | user: `reno` / pass: `reno_secret` / db: `reno_dev` |
| Redis | `localhost:6380` | pass: `reno_redis_secret` |
| MinIO API | http://localhost:9000 | — |
| MinIO Console | http://localhost:9001 | user: `minioadmin` / pass: `minioadmin` |
| MailHog UI | http://localhost:8025 | — |
| Adminer (DB UI) | http://localhost:8080 | See PostgreSQL creds above |

---

## Step 2 — Install Dependencies

```powershell
cd "C:\Users\Renas Talabani\Documents\Reno System Ai"
pnpm install
```

---

## Step 3 — Run Database Migrations

```powershell
pnpm db:migrate
```

This applies all 19 phase migrations to your local PostgreSQL.

---

## Step 4 — Seed Demo Data

```powershell
pnpm db:seed
```

This creates:
- Demo tenant: `demo`
- Admin user: `admin@demo.com` / `Demo@123456`
- Complete chart of accounts, HR setup, CRM pipeline, inventory, suppliers
- System roles, permissions, branding
- All modules pre-configured and enabled

---

## Step 5 — Start the API Server

Open a **new terminal**:

```powershell
cd "C:\Users\Renas Talabani\Documents\Reno System Ai"
pnpm dev:api
```

The API starts at **http://localhost:4000**

Verify it's running:
```powershell
curl http://localhost:4000/health
# Expected: {"status":"ok","service":"reno-api",...}

curl http://localhost:4000/health/db
# Expected: {"status":"ok","database":"connected"}
```

---

## Step 6 — Start the Web App

Open a **new terminal**:

```powershell
cd "C:\Users\Renas Talabani\Documents\Reno System Ai"
pnpm dev:web
```

The web app starts at **http://localhost:3000**

---

## Step 7 — Login to Reno System

Open your browser and go to: **http://localhost:3000/login**

Login with:
- **Email**: `admin@demo.com`
- **Password**: `Demo@123456`

---

## Verified Working Modules

After logging in, the following modules are accessible from the sidebar:

### Core
- Dashboard `/dashboard`
- Notifications `/notifications`

### Identity
- Users `/users`
- Roles & Permissions `/roles`
- Organization `/organization`

### Business
- HR `/hr` — employees, attendance, leave, payroll, job positions, shifts
- Projects `/projects` — boards, tasks, sprints, time logs
- CRM `/crm` — contacts, companies, pipeline, contracts
- Sales `/sales` — products, quotations, orders, invoices, subscriptions
- Finance `/finance` — chart of accounts, journal entries, bank accounts, budgets
- Inventory `/inventory` — products, warehouses, movements, stock balances
- Procurement `/procurement` — suppliers, RFQs, purchase orders
- Manufacturing `/manufacturing` — BOMs, work centers, production orders
- Analytics `/analytics` — dashboards, widgets, reports

### Workspace
- Communication `/communication` — channels, messages, video calls
- Documents `/documents` — files, folders, MinIO storage
- Knowledge Base `/knowledge` — articles, categories

### Intelligence
- Reno Brain `/brain` — AI agents, memory, chat
- Automation `/automation` — workflows, triggers, tasks

### Platform
- Marketplace `/marketplace` — plugins, themes, subscriptions
- AI Executive `/ai-executive` — digital twin, reports, predictions, proposals, decisions

### System
- Service Desk `/helpdesk` — tickets, agents, SLA, CSAT
- Portal Admin `/portal-admin` — customer/employee portal
- Settings `/settings`
- Audit Logs `/audit-logs`

---

## API Endpoints

Base URL: `http://localhost:4000/v1`

| Endpoint | Description |
|----------|-------------|
| `POST /v1/auth/login` | Login and get JWT token |
| `GET /v1/auth/me` | Current user info |
| `GET /health` | API health check |
| `GET /health/db` | Database connection check |
| `GET /graphql` | GraphQL playground (dev only) |

All authenticated requests need: `Authorization: Bearer <token>`

---

## AI Executive Layer (Phase 19)

The AI Executive requires an AI provider configured in Brain settings.

1. Go to `/brain` → Settings → AI Providers
2. Add your Anthropic API key (or leave empty for mock responses)
3. Then use `/ai-executive` to:
   - Chat with AI executives (CEO, CFO, COO, CHRO, etc.)
   - Compute Digital Twin health scores
   - Generate executive reports
   - Run business predictions and scenario planning
   - Review AI proposals (with human approval gate)
   - Track decisions and AI-generated lessons

Without an API key, all AI features return mock/placeholder responses.

---

## Flutter Mobile App (Optional)

The Flutter mobile app is in `apps/mobile/`.

Prerequisites:
1. Install Flutter SDK and Android Studio / Xcode
2. Set up an Android emulator or physical device

```powershell
cd "C:\Users\Renas Talabani\Documents\Reno System Ai\apps\mobile"
flutter pub get
flutter run
```

The mobile app connects to the API at `http://10.0.2.2:4000` (Android emulator) or `http://localhost:4000` (physical device on same network).

---

## Running Everything Together (Turbo)

To run API + Web together:

```powershell
pnpm dev
```

This uses Turborepo to run both services in parallel with TUI output.

---

## Known Issues & Limitations

| Issue | Status | Workaround |
|-------|--------|------------|
| AI features require API key | By design | Add ANTHROPIC_API_KEY to `.env` |
| Flutter mobile not tested on all platforms | Limited | Use web or API for full feature testing |
| MinIO buckets auto-created by Docker setup | Automatic | Check MinIO console at :9001 if uploads fail |
| Email sending in dev mode | Captured by MailHog | View sent emails at http://localhost:8025 |
| GraphQL playground only available in `development` mode | By design | Set `NODE_ENV=development` |

---

## Stopping Everything

```powershell
# Stop API and Web (Ctrl+C in each terminal)

# Stop Docker services
docker compose down

# Stop Docker services and remove data volumes (full reset)
docker compose down -v
```

---

## Full Reset (Start Fresh)

```powershell
docker compose down -v
docker compose up -d
# Wait 15 seconds
pnpm db:migrate
pnpm db:seed
```

---

## Environment Configuration

All environment variables are in `.env` at the project root. Key values:

```env
DATABASE_URL=postgresql://reno:reno_secret@localhost:5433/reno_dev
REDIS_URL=redis://:reno_redis_secret@localhost:6380
ANTHROPIC_API_KEY=           # Add your key to enable AI features
SEED_ADMIN_EMAIL=admin@demo.com
SEED_ADMIN_PASSWORD=Demo@123456
```

The web app reads `NEXT_PUBLIC_API_URL` from `apps/web/.env.local` (created automatically at setup).
