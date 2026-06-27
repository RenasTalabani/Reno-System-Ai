# Reno System — Future Roadmap

**Current Version:** v1.0.0 (Enterprise GA)
**Last Updated:** 2026-06-27

---

## v1.0.x — Patch Releases (Q3 2026)

Bug fixes and minor improvements from v1.0.0 known issues:

- Fix: Color-blind SVG filter flash in Safari (BUG-01)
- Fix: Board simulation infinite spinner on AI provider rate limit (BUG-02)
- Fix: Reduced motion in iOS Safari private mode (BUG-03)
- Fix: API key IP allow-listing UI
- Perf: Add GIN full-text search indexes on high-volume tables
- Perf: Manufacturing MRP moved to background job queue

---

## v1.1.0 — Performance & Integrations (Q4 2026)

### Database & Performance
- **pgvector** — Native PostgreSQL vector extension for semantic search (replaces CPU cosine similarity)
- **Full-text search** — GIN indexes + pg_trgm on all searchable models
- **Soft-delete cleanup** — Scheduled job to permanently delete old soft-deleted records
- **Async reports** — Large reports generated as background jobs with email delivery

### Real-Time
- **WebSocket push** — Replace polling with real-time push for notifications, activity feeds, live KPIs

### AI Improvements
- **Embedding version management** — Track and re-index when AI model changes
- **Auto prediction scoring** — Brain auto-compares predictions to actuals when period closes
- **Cached AI responses** — Offline fallback for common Brain queries

### Mobile
- **Biometric auth** — Face ID and fingerprint login for iOS and Android
- **Full Finance module** — Complete finance views on mobile
- **Manufacturing mobile** — Production order management on mobile

### Integrations
- **SSO UI** — Configure SAML/OIDC SSO through the admin UI
- **Google Calendar sync** — Two-way calendar for meetings and leave
- **Outlook Calendar sync** — Two-way calendar integration
- **Stripe integration** — Native payment gateway for invoice collection

---

## v1.2.0 — Offline & Advanced AI (Q1 2027)

### Offline Capability
- **Mobile offline mode** — Create and edit records offline; sync when connected
- **Progressive Web App** — Web app installable with offline read capability

### AI Evolution
- **Brain v2** — Multi-step reasoning chains for complex analysis
- **AI workflow automation** — Brain can draft and propose automated workflows
- **Predictive hiring** — AI recommendations for hiring based on project demand forecasting
- **Customer health scoring** — AI-derived customer churn risk scores from CRM + support data

### Localization
- **Hijri calendar** — Support for Hijri dates in finance and HR
- **Additional languages** — Farsi/Persian, Turkish, French, German
- **Number localization** — Full locale-aware number formatting

---

## v2.0.0 — Enterprise Scale & Row-Level Security (2027)

### Security
- **Row-Level Security (RLS)** — Database-level tenant isolation via PostgreSQL RLS policies
- **Field-level encryption** — Selective encryption for PII fields (SSN, bank account numbers)
- **Zero-trust networking** — mTLS between internal services

### Scale
- **Horizontal sharding** — Tenant-based database sharding for very large deployments
- **Event sourcing** — Critical modules (Finance, Inventory) move to event-sourced architecture for full audit trail
- **CQRS pattern** — Read/write separation for high-throughput modules

### Platform
- **Marketplace** — Public plugin marketplace for third-party plugins
- **White-labeling** — Full white-label theming with custom domains per tenant
- **Multi-region** — Geographic data residency for EU/APAC compliance

### AI
- **Brain v3** — Agentic AI capable of multi-step task execution with approval checkpoints
- **Custom AI models** — Plug in fine-tuned models per tenant
- **AI auditor** — AI that audits other AI decisions for bias and consistency

---

## Long-Term Vision (2028+)

- **Industry-specific editions** — Healthcare, Manufacturing, Professional Services, Education editions with pre-configured modules and compliance templates
- **Federated deployments** — Reno nodes that sync across air-gapped environments
- **Predictive ERP** — System proactively executes routine decisions (reorder, scheduling, invoicing) with human override, rather than just recommending them
- **Natural language configuration** — Configure workflows, reports, and rules using plain English
- **AI-to-AI marketplace** — Reno Brain instances negotiate service agreements and data sharing across organizations (with full human approval)

---

## Deprecation Schedule

| Feature | Deprecated In | Removed In | Replacement |
|---|---|---|---|
| CPU cosine similarity | v1.0.0 | v1.2.0 | pgvector |
| Polling-based notifications | v1.0.0 | v1.2.0 | WebSocket push |
| Query-level tenant isolation | v1.0.0 | v2.0.0 | PostgreSQL RLS |

---

## Contribution

Feature requests and bug reports: create an issue in the project repository.
For enterprise roadmap prioritization, contact your account manager.
