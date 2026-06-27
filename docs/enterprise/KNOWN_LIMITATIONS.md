# Reno System — Known Limitations v1.0.0

---

## AI / Brain

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| AI-01 | Vector embeddings use JSON float arrays (CPU cosine similarity), not pgvector | Semantic search scales to ~100K records before performance impact | Migrate to pgvector extension in v1.1 |
| AI-02 | AI briefing generation may take 5–15 seconds on first call of the day | Slight UX delay first morning load | Pre-generate at 07:00 via cron |
| AI-03 | Board simulation quality depends on AI provider model; GPT-3.5 produces lower-quality board discussions | Lower insight quality with cheaper models | Use GPT-4 or Claude 3.5+ for best results |
| AI-04 | AI predictions do not yet auto-update when actuals arrive — manual comparison required | Accuracy tracking requires manual "mark as succeeded/failed" | Auto-comparison to be added in v1.1 |
| AI-05 | Brain AI questions require an active AI provider API key; no offline AI capability | No AI if provider API is down | Add fallback/cached responses in v1.2 |

---

## Database

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| DB-01 | No native full-text search index on all models — search uses ILIKE | Search on large datasets (>1M rows) may be slow | Add GIN indexes and pg_trgm in v1.1 |
| DB-02 | Vector embedding dimensions fixed at model output size; changing embedding model requires re-indexing all content | Migration effort when switching AI models | Planned embedding version management in v1.1 |
| DB-03 | Soft deletes (`deletedAt`) implemented but no scheduled hard-delete cleanup job | Soft-deleted records accumulate over time | Add scheduled cleanup in v1.1 |
| DB-04 | Prisma does not support database-level row security (RLS); tenant isolation enforced at query level | If a query bug bypasses tenantId filter, cross-tenant access is theoretically possible | All queries reviewed; RLS migration planned for v2.0 |

---

## Mobile

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| MOB-01 | Mobile app requires network connectivity; no offline mode for data creation | Cannot create records offline | Offline sync planned for v1.2 |
| MOB-02 | Push notifications on iOS require APNs configuration by the operator | iOS users won't receive push without APNs setup | See INSTALLATION_GUIDE.md for setup |
| MOB-03 | Biometric authentication (Face ID / fingerprint) is not yet implemented | Users must type password each time | Planned for v1.1 |
| MOB-04 | Mobile app does not yet support all modules — missing: Finance detail views, Manufacturing | Finance/manufacturing workflows must use the web app | Full coverage planned for v1.2 |

---

## Integrations

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| INT-01 | No built-in email server; requires external SMTP configuration | Email notifications require operator SMTP setup | See ADMINISTRATOR_GUIDE.md |
| INT-02 | SSO (SAML/OIDC) is architecture-ready but not yet configurable via UI | SSO requires manual code configuration | SSO UI configuration planned for v1.1 |
| INT-03 | Calendar sync (Google/Outlook) not yet implemented | No calendar integration for meetings/leave | Planned v1.2 |
| INT-04 | Payment gateway integration (Stripe, PayPal) is not yet built-in | Invoice payments must be manually registered | Third-party plugin support available now |

---

## Performance

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| PERF-01 | Manufacturing MRP recalculation is synchronous; large BOMs (>500 components) may take >10 seconds | UI may appear unresponsive during MRP | Move to background job in v1.1 |
| PERF-02 | Real-time notifications use polling (5-second interval), not WebSocket push | Slight latency for live updates; 5s delay | WebSocket upgrade planned v1.1 |
| PERF-03 | Large report generation (>10K rows) is synchronous | Reports with many records may timeout | Async report jobs with download link planned v1.1 |

---

## Security

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| SEC-01 | Database-level Row Level Security (RLS) not yet enabled | Tenant isolation at query level only (robust but not RLS-enforced) | RLS migration planned v2.0 |
| SEC-02 | Session tokens stored in httpOnly cookies — CSRF protection via SameSite=Strict | Low risk, but SameSite strict may cause issues with some SSO flows | Document exceptions in v1.1 |
| SEC-03 | API key creation does not currently support IP allow-listing | API keys are unrestricted by IP | IP restriction UI planned v1.1 |

---

## Localization

| # | Limitation | Impact | Workaround / Roadmap |
|---|---|---|---|
| L10N-01 | Kurdish (Sorani) translations are community-provided and may have gaps | Some less-used UI strings may display in English | Community translation contributions welcome |
| L10N-02 | Date formatting in RTL locales uses Gregorian calendar | Some regions prefer Hijri/Solar calendar | Planned v1.2 |
| L10N-03 | Number formatting (thousands separator) not fully localized for all locales | Numbers display in Western format | Planned v1.1 |

---

## Browser Support

| Browser | Status |
|---|---|
| Chrome 120+ | Fully supported |
| Firefox 120+ | Fully supported |
| Edge 120+ | Fully supported |
| Safari 17+ | Fully supported |
| Safari 15–16 | Mostly supported (minor CSS issues) |
| Internet Explorer | Not supported |
| Chrome < 100 | Not supported |

---

## Known Bugs (v1.0.0)

| # | Description | Severity | Fix Target |
|---|---|---|---|
| BUG-01 | Color-blind SVG filters may flash briefly on initial page load in Safari | Low | v1.0.1 |
| BUG-02 | Board simulation UI shows "loading" spinner permanently if AI provider returns 429 rate limit | Medium | v1.0.1 |
| BUG-03 | Reduced motion preference is not persisted on iOS Safari (localStorage blocked in private mode) | Low | v1.0.1 |
