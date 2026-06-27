# Reno System — User Guide v1.0.0

---

## Getting Started

### Logging In
1. Navigate to your Reno instance URL (e.g., `https://app.yourdomain.com`)
2. Enter your email and password
3. If 2FA is enabled, enter your authenticator code
4. Select your tenant if you belong to multiple tenants

### First-Time Setup
On first login you will see the **Onboarding Tour** — this walks you through:
- Setting your profile and timezone
- Connecting your preferred notifications
- Customizing your dashboard widgets

You can replay the tour at any time via **Settings → Help → Replay Onboarding**.

### Navigation
- **Sidebar** — main module navigation (collapsible)
- **Top bar** — search, notifications, user menu, language selector
- **Ctrl+K (⌘K on Mac)** — global command palette: jump to any page, search records, or ask Reno Brain
- **Favorites** — star any page to pin it; accessible from the sidebar top
- **Recently Viewed** — last 10 records you viewed, shown in the sidebar

---

## Dashboard

Your dashboard shows real-time widgets:
- **AI Daily Briefing** — generated each morning from your actual business data
- **Pending Approvals** — tasks that need your decision
- **KPI Cards** — configurable key metrics (revenue, tickets, projects)
- **Activity Feed** — recent actions across modules

Customize by clicking **Edit Dashboard** in the top-right corner.

---

## Reno Brain (AI Assistant)

### Floating Assistant
A floating blue button appears on every screen. Click it to:
- Ask questions about the current page ("How many open invoices do I have?")
- Request actions ("Create a leave request for next Monday")
- Get AI recommendations for the current context

### Daily Briefing
Navigate to **Brain → Daily Briefing** for your AI-generated morning briefing covering:
- Today's business mood (Excellent / Good / Stable / Cautious / Critical)
- Key metrics (open tickets, pending invoices, active projects)
- Urgent items requiring attention
- Today's top priorities, ranked by importance

### AI Recommendations
Brain generates recommendations automatically. For each recommendation:
- **Evidence** — real data points from your system that informed the recommendation
- **Confidence** — percentage confidence the recommendation is correct
- **Actions** — Accept, Reject (with reason), or Ignore

Accepted/rejected recommendations feed back into Brain's learning engine.

### Board Meeting Simulator
**Brain → Board Meeting** — simulate an AI executive board session:
1. Enter an agenda (strategic topics, challenges, decisions)
2. Brain simulates discussion between CEO, CFO, COO, CMO, and CTO personas
3. Review decisions, action items, conflicts, and the consensus statement
4. Board decisions never auto-execute — human approval required for all actions

### Semantic Search
**Brain → Search** — find anything across all modules using natural language:
- "invoices from last quarter with payment issues"
- "employee leave requests pending approval"
- "projects at risk of deadline"

---

## HR Module

### Leave Requests
1. **HR → Leave → New Request**
2. Select leave type, dates, and add a note
3. Submit — your manager receives a notification
4. Track status: Pending → Approved / Rejected

### Payroll
**HR → Payroll → My Payslips** — view and download your payslips as PDF.

### Performance
**HR → Performance** — view your active goals, check-ins, and performance reviews.

---

## CRM

### Contacts & Companies
- **CRM → Contacts** — search, filter, create, and merge contacts
- **CRM → Companies** — company profiles with full activity timeline

### Opportunities
1. **CRM → Pipeline** — drag-and-drop Kanban board
2. Move opportunities through stages by dragging cards
3. Click any card for full details, activities, and AI probability score

### Activities
Log calls, meetings, emails, and tasks on any contact, company, or opportunity. Activities appear in the timeline and feed Brain's context for AI suggestions.

---

## Sales

### Quotations
1. **Sales → Quotations → New**
2. Add line items (products from inventory catalog)
3. Apply discounts, taxes, payment terms
4. Send to customer — generates a PDF with your company branding
5. Convert to order once accepted

### Invoices
**Sales → Invoices** — track invoice status: Draft → Sent → Partially Paid → Paid → Overdue

---

## Finance

### Bank Reconciliation
**Finance → Bank → Reconcile** — import bank statement CSV and match transactions to journal entries.

### Budgets
**Finance → Budgets** — view budget vs. actual per department and period.

---

## Helpdesk

### Submitting Tickets
Users: **Helpdesk → New Ticket** or via Customer Portal.

### Managing Tickets (Agents)
- **Helpdesk → Tickets** — queue filtered by assignment, status, priority
- Click any ticket to view thread, internal notes, SLA timer
- Reassign, escalate, merge duplicates

### SLA Tracking
SLA breach warnings appear 30 minutes before deadline. SLA breaches are tracked in Brain's accuracy metrics.

---

## Communications

### Omni-Channel Inbox
**Comm → Inbox** — all incoming messages from email, SMS, WhatsApp, and live chat in one place.
- Assign threads to team members
- View full conversation history across channels
- Send replies from any channel within Reno

---

## Documents

### Uploading
Drag-and-drop or click **Upload** in **Docs → My Documents**.
AI automatically extracts metadata and generates a summary.

### Version Control
Each document maintains a full version history. Click **History** on any document to view, compare, or restore earlier versions.

---

## Portals

### Customer Portal
Your customers access: `https://app.yourdomain.com/portal/customer`
- Submit and track support tickets
- View and pay invoices
- Track order status

### Employee Portal
Your employees access: `https://app.yourdomain.com/portal/employee`
- Submit leave requests
- View payslips
- Update personal information

---

## Mobile App

The Reno mobile app is available for iOS and Android. Features:
- Full dashboard with KPI widgets
- Notifications (push + in-app)
- Leave request submission and approval
- Ticket management
- Barcode/QR scanner (linked to inventory)
- Reno Brain AI chat

---

## Accessibility Features

- **High Contrast Mode** — Settings → Appearance → High Contrast
- **Color Blind Mode** — Settings → Appearance → Color Blind Filter (Deuteranopia, Protanopia, Tritanopia, Achromatopsia)
- **Reduced Motion** — Settings → Appearance → Reduce Motion
- **Keyboard Navigation** — all interactive elements are keyboard accessible; press Tab to navigate, Enter to activate
- **Screen Reader** — WCAG 2.2 AA compliant; tested with NVDA and VoiceOver

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+K | Open command palette |
| Ctrl+/ | Show keyboard shortcuts |
| Escape | Close modal/panel |
| Tab | Navigate forward |
| Shift+Tab | Navigate backward |
| Enter | Activate focused element |

---

## Language & Region

**Settings → Language** — switch between English, Arabic (RTL), and Kurdish (Sorani, RTL).
Layout automatically mirrors for right-to-left languages.

---

## Getting Help

- **Help icon** (?) in the top bar — opens context-sensitive documentation
- **Brain Assistant** — ask Reno Brain any question about the system
- **Keyboard shortcut Ctrl+K** → type "help" for quick guidance
