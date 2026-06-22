# Reno System — Master Blueprint v1
## Document 4: Module Specifications

**Project:** Reno System  
**Owner:** Renas Talabani  
**Status:** DRAFT — Awaiting Owner Approval  
**Version:** 1.0.0  
**Date:** 2026-06-22  

---

## Overview

This document defines the feature set, data entities, and key behaviors for every module in Reno System. Modules are listed in build order (Phase 0 first). Each module spec is the source of truth for what gets built in that phase.

---

## Phase 0 — Reno Core (Identity & Foundation)

**Deliverable:** The platform foundation. No business logic — only the infrastructure every other module depends on.

### Features

| Feature | Description |
|---|---|
| Tenant Registration | Self-service signup, subdomain allocation, plan selection |
| Company Management | Multi-company setup within one tenant |
| Branch Management | Branch/office locations per company |
| Department Management | Hierarchical departments with parent-child support |
| Team Management | Cross-department teams |
| User Management | Create, invite, deactivate users with role assignment |
| Authentication | Email/password login, JWT, refresh tokens |
| MFA | TOTP authenticator app + email OTP backup |
| Role Management | Create/edit custom roles, assign permissions |
| Permission Engine | Granular RBAC with scope enforcement |
| Session Management | Multi-device sessions, revocation |
| Branding Engine | Logo, colors, fonts, app name per tenant/company |
| Settings Center | Tenant, company, and branch-level settings |
| Audit Log Viewer | Full history of all actions (filterable, exportable) |
| Notification Center | In-app notification inbox |
| Activity Feed | Real-time activity stream per user |
| Feature Flags | Enable/disable modules and features per tenant |
| Language Support | i18n infrastructure (UI translations) |
| Dark/Light Mode | User-level theme preference |

### Key Entities
`core_tenants`, `core_companies`, `core_branches`, `core_departments`, `core_teams`, `core_users`, `core_user_profiles`, `core_user_memberships`, `core_roles`, `core_permissions`, `core_role_permissions`, `core_user_roles`, `core_sessions`, `sys_audit_logs`, `sys_notifications`, `sys_settings`, `sys_branding`, `sys_feature_flags`, `sys_jobs`

---

## Phase 1 — Reno HR

**Deliverable:** Complete HR platform for managing the full employee lifecycle.

### Features

| Feature | Description |
|---|---|
| Employee Directory | Central employee database with org chart view |
| Employee Profiles | Personal, professional, contract, emergency contact info |
| Onboarding Checklists | Configurable onboarding task lists for new hires |
| Document Storage | Upload and manage employee documents (contracts, IDs, certs) |
| Attendance | Clock in/out, daily attendance records, monthly summaries |
| Work Schedules | Define work days, hours, and shift patterns |
| Shift Management | Create shifts, assign employees, manage rotations |
| Leave Management | Leave types, balances, request workflow, calendar view |
| Overtime Management | Log and approve overtime, integrate with payroll |
| Payroll Engine | Salary structures, components (basic, allowances, deductions) |
| Payroll Runs | Monthly payroll processing with approval workflow |
| Payslips | Auto-generated PDF payslips per employee per period |
| Salary History | Complete salary change audit trail |
| Recruitment | Job postings, application tracking pipeline, interview stages |
| Candidate Portal | External application form for candidates |
| Training Programs | Create courses, enroll employees, track completion |
| Performance Reviews | 360° review cycles, goal setting, ratings |
| Career Progression | Job levels, promotion history, career path visualization |
| Disciplinary Actions | Formal warning, suspension, termination records |
| Rewards & Recognition | Points-based reward system, peer recognition |
| Employee Portal | Self-service portal (view payslips, request leave, update info) |
| HR Reports | Headcount, turnover, attendance, payroll cost reports |
| HR Dashboard | Key HR metrics at a glance |

### Key Entities
`hr_employees`, `hr_emergency_contacts`, `hr_employment_history`, `hr_attendance_logs`, `hr_attendance_configs`, `hr_shifts`, `hr_shift_assignments`, `hr_leave_types`, `hr_leave_balances`, `hr_leave_requests`, `hr_payroll_periods`, `hr_payroll_runs`, `hr_payroll_items`, `hr_salary_structures`, `hr_salary_components`, `hr_overtime_records`, `hr_recruitment_jobs`, `hr_recruitment_apps`, `hr_training_programs`, `hr_training_enrollments`, `hr_performance_cycles`, `hr_performance_reviews`, `hr_performance_goals`, `hr_disciplinary_cases`, `hr_rewards`, `hr_documents`, `hr_job_positions`

---

## Phase 2 — Reno Projects

**Deliverable:** Full project and task management platform with multiple views.

### Features

| Feature | Description |
|---|---|
| Project Creation | Name, description, dates, budget, priority, status |
| Project Templates | Save and reuse project structures |
| Milestones | Key deliverable dates with progress tracking |
| Task Management | Create, assign, prioritize, due dates, status |
| Subtasks | Nested tasks under any task |
| Task Dependencies | Block/unblock relationships between tasks |
| Kanban Board | Drag-and-drop task board with customizable columns |
| Calendar View | Monthly calendar of tasks and milestones |
| Timeline View | Chronological project view |
| Gantt Chart | Interactive Gantt with dependency lines |
| List View | Traditional task list with sorting/filtering |
| Time Tracking | Log hours against tasks; daily and weekly timesheets |
| Resource Planning | View team workload and capacity |
| File Attachments | Attach files to tasks and projects |
| Comments & Mentions | Task-level discussions with @mentions |
| Activity Log | Full history of changes on each task/project |
| Labels & Tags | Color-coded task labels for categorization |
| Sprints | Agile sprint planning and management |
| Project Dashboard | Progress, budget burn, overdue tasks, team activity |
| Cross-Project Reports | Portfolio view, resource utilization, time reports |

### Key Entities
`proj_projects`, `proj_milestones`, `proj_tasks`, `proj_subtasks`, `proj_task_assignments`, `proj_task_dependencies`, `proj_time_logs`, `proj_comments`, `proj_attachments`, `proj_sprints`, `proj_sprint_tasks`, `proj_labels`, `proj_task_labels`, `proj_columns`, `proj_templates`

---

## Phase 3 — Reno CRM

**Deliverable:** Sales pipeline and customer relationship management.

### Features

| Feature | Description |
|---|---|
| Lead Management | Capture, qualify, and assign leads |
| Lead Sources | Track where leads come from (web, social, referral, event) |
| Contact Management | Individual contacts linked to companies |
| Company/Account Management | Business accounts with full history |
| Opportunity Pipeline | Multi-stage sales pipeline with probability |
| Pipeline Views | Kanban, list, and forecast views |
| Activities | Log calls, emails, meetings, notes against any record |
| Email Tracking | Track email opens and link clicks |
| Meeting Scheduler | Schedule and log meetings |
| Call Logging | Log and record call outcomes |
| Contracts | Draft, send, and track contracts |
| Contract Templates | Reusable contract templates |
| Sales Forecasting | Revenue forecast based on pipeline probability |
| Lost Reason Tracking | Analyze why deals are lost |
| Customer 360 View | All interactions, purchases, projects in one view |
| Tags & Segments | Categorize contacts for targeted communication |
| CRM Reports | Pipeline value, conversion rates, rep performance |
| CRM Dashboard | Pipeline health, activities due, won/lost this month |

### Key Entities
`crm_leads`, `crm_contacts`, `crm_companies`, `crm_opportunities`, `crm_pipeline_stages`, `crm_activities`, `crm_email_logs`, `crm_contracts`, `crm_contract_templates`, `crm_tags`, `crm_contact_tags`

---

## Phase 4 — Reno Sales

**Deliverable:** Quote-to-cash workflow integrated with CRM and Inventory.

### Features

| Feature | Description |
|---|---|
| Product Catalog | Sellable products and services with pricing |
| Price Lists | Multiple price books (retail, wholesale, VIP) |
| Discount Rules | Conditional discount policies |
| Quotations | Create professional quote documents |
| Quote Approval | Approval workflow before sending to customer |
| Quote to Order | One-click convert approved quote to order |
| Sales Orders | Manage confirmed customer orders |
| Order Fulfillment | Track fulfillment status linked to inventory |
| Invoicing | Generate invoices from orders or standalone |
| Invoice Approval | Internal approval before issuing |
| Payment Tracking | Record full and partial payments |
| Payment Reminders | Automated overdue payment reminders |
| Credit Notes | Issue refunds and credit notes |
| Subscriptions | Recurring billing with auto-invoice generation |
| Subscription Plans | Define plan tiers, billing cycles, trial periods |
| Revenue Dashboard | MRR, ARR, total revenue, invoiced vs. collected |
| Sales Reports | By rep, product, region, period |
| PDF Generation | Branded PDF quotes, orders, invoices |
| Email Integration | Send documents directly to customers |

### Key Entities
`sales_products`, `sales_price_lists`, `sales_price_list_items`, `sales_discounts`, `sales_quotes`, `sales_quote_items`, `sales_orders`, `sales_order_items`, `sales_invoices`, `sales_invoice_items`, `sales_payments`, `sales_credit_notes`, `sales_subscriptions`, `sales_subscription_items`, `sales_subscription_plans`

---

## Phase 5 — Reno Inventory

**Deliverable:** Multi-warehouse inventory management with barcode and expiry tracking.

### Features

| Feature | Description |
|---|---|
| Product Catalog | Full product database with variants (size, color, SKU) |
| Product Categories | Hierarchical category tree |
| Units of Measure | Configurable UoM with conversion rules |
| Warehouse Management | Multiple warehouses with zones/bins/shelves |
| Stock Dashboard | Real-time stock levels per product per warehouse |
| Stock Movements | Inbound, outbound, transfers, adjustments |
| Stock Adjustments | Manual corrections with reason and approver |
| Barcode Support | Generate and scan EAN-13, Code 128, QR codes |
| Batch/Lot Tracking | Track groups of items by lot number |
| Expiry Tracking | Expiry date management with alerts |
| FIFO/FEFO/LIFO | Costing and pick strategies |
| Reorder Rules | Automatic low-stock alerts and reorder suggestions |
| Smart Reordering | AI-powered demand forecasting for reorder quantities |
| Stock Transfers | Inter-warehouse transfer orders |
| Inventory Valuation | Average cost, FIFO, standard cost |
| Product Images | Multi-image product gallery |
| Inventory Reports | Stock on hand, movements, valuation, ABC analysis |
| Inventory Dashboard | Stock value, low stock alerts, movement trends |

### Key Entities
`inv_products`, `inv_product_variants`, `inv_product_images`, `inv_categories`, `inv_warehouses`, `inv_warehouse_zones`, `inv_warehouse_locations`, `inv_stock`, `inv_stock_movements`, `inv_stock_adjustments`, `inv_barcodes`, `inv_batches`, `inv_expiry_records`, `inv_reorder_rules`, `inv_transfers`, `inv_transfer_items`, `inv_units_of_measure`, `inv_uom_conversions`

---

## Phase 6 — Reno Procurement

**Deliverable:** Purchase requisition to goods receipt workflow.

### Features

| Feature | Description |
|---|---|
| Supplier Directory | Supplier master with contacts, payment terms |
| Supplier Evaluation | Score suppliers on delivery, quality, price |
| Supplier Portal | Self-service portal for suppliers (future) |
| Purchase Requests | Internal requisition with approval workflow |
| Request Templates | Common purchase request templates |
| Purchase Orders | Generate POs from approved requests or directly |
| PO Approval Workflow | Multi-level PO approval by amount thresholds |
| Send to Supplier | Email PO directly to supplier from system |
| Goods Received Notes | Record what was actually received vs. ordered |
| Partial Receiving | Handle split deliveries |
| Quality Inspection | Accept/reject received goods with notes |
| 3-Way Matching | Match PO → GRN → Supplier Invoice |
| Procurement Reports | Spend analysis, supplier performance, delivery time |
| Procurement Dashboard | Open POs, pending approvals, spend this month |

### Key Entities
`proc_suppliers`, `proc_supplier_contacts`, `proc_supplier_evaluations`, `proc_purchase_requests`, `proc_pr_items`, `proc_purchase_orders`, `proc_po_items`, `proc_receiving_notes`, `proc_receiving_items`, `proc_quality_checks`

---

## Phase 7 — Reno Finance

**Deliverable:** Full double-entry accounting with reporting and budgeting.

### Features

| Feature | Description |
|---|---|
| Chart of Accounts | Configurable CoA with account types and hierarchy |
| Journal Entries | Manual and automated double-entry journals |
| General Ledger | Complete ledger with drill-down to entries |
| Accounts Payable | Supplier invoices, payment scheduling, aging |
| Accounts Receivable | Customer invoices, collection tracking, aging |
| Bank Accounts | Register company bank accounts |
| Bank Reconciliation | Match bank transactions to system entries |
| Tax Management | Tax rates, tax groups, tax reports (VAT/GST) |
| Multi-Currency | Exchange rates, forex gain/loss auto-posting |
| Cost Centers | Tag expenses and revenues to cost centers |
| Budgets | Annual and monthly budgets per account/cost center |
| Budget vs. Actual | Real-time comparison of budget vs. spend |
| Profit & Loss | Period P&L statement |
| Balance Sheet | Snapshot balance sheet at any date |
| Cash Flow Statement | Direct and indirect method cash flow |
| Fixed Assets | Asset register, depreciation schedules |
| Fiscal Year Management | Open/close fiscal periods |
| Finance Dashboard | Cash position, receivables, payables, P&L summary |
| Finance Reports | All standard reports exportable to PDF/Excel |

### Key Entities
`fin_accounts`, `fin_account_types`, `fin_journal_entries`, `fin_journal_lines`, `fin_cost_centers`, `fin_bank_accounts`, `fin_bank_transactions`, `fin_bank_reconciliations`, `fin_tax_rates`, `fin_tax_groups`, `fin_currencies`, `fin_currency_rates`, `fin_budgets`, `fin_budget_lines`, `fin_fiscal_years`, `fin_fiscal_periods`, `fin_fixed_assets`, `fin_depreciation_schedules`

---

## Phase 8 — Reno Documents

**Deliverable:** Central document management with OCR, versioning, e-signatures, and approval flows.

### Features

| Feature | Description |
|---|---|
| Document Center | Folder-based document library |
| Upload & Storage | Single and bulk upload, drag-and-drop |
| Version Control | Track all document versions with diff view |
| OCR Processing | Auto-extract text from scanned PDFs and images |
| Smart Data Extraction | AI pulls structured data from invoices, contracts |
| Preview | In-browser document preview (PDF, images, Office) |
| Digital Signatures | Request and collect e-signatures from multiple parties |
| Signature Status | Track signing progress, send reminders |
| Approval Workflows | Route documents through configurable approval chains |
| Approval Comments | Annotate and comment during review |
| Document Tags | Tag documents for easy retrieval |
| Document Templates | Create templates for frequently used documents |
| Access Control | Per-document read/edit/sign permissions |
| Expiry Alerts | Alert on document expiry (contracts, licenses) |
| Document Search | Full-text search including OCR content |
| Audit Trail | Complete history of views, edits, approvals, signatures |

### Key Entities
`doc_folders`, `doc_documents`, `doc_versions`, `doc_signatures`, `doc_signature_parties`, `doc_signature_events`, `doc_ocr_jobs`, `doc_approvals`, `doc_approval_steps`, `doc_approval_actions`, `doc_tags`, `doc_document_tags`, `doc_templates`, `doc_access_rules`

---

## Phase 9 — Reno Communication

**Deliverable:** Unified communications hub for team messaging, voice, and video.

### Features

| Feature | Description |
|---|---|
| Direct Messages | 1:1 private messaging between users |
| Group Channels | Topic-based channels (public and private) |
| Thread Replies | Threaded conversations within channels |
| File Sharing | Share files inline in chat |
| Emoji & Reactions | Emoji reactions on messages |
| @Mentions | Mention users and channels |
| Message Search | Full-text search across all messages |
| Message Pinning | Pin important messages in channels |
| Read Receipts | See who has read messages |
| Voice Calls | 1:1 and group voice calls |
| Video Meetings | Scheduled and instant video meetings |
| Screen Sharing | Share screen during meetings |
| Meeting Recordings | Record and store meetings |
| Meeting Notes | Auto-generated meeting summaries (AI) |
| Announcements | Broadcast announcements to all or specific groups |
| Status | Online/Away/Busy/Do Not Disturb status |
| Notification Settings | Per-channel notification preferences |
| Integration Hooks | Post messages from automations and alerts |

### Key Entities
`comm_channels`, `comm_channel_members`, `comm_messages`, `comm_message_attachments`, `comm_message_reactions`, `comm_threads`, `comm_calls`, `comm_call_participants`, `comm_meetings`, `comm_meeting_participants`, `comm_meeting_notes`, `comm_announcements`, `comm_announcement_reads`

---

## Phase 10 — Reno AI (Reno Brain)

**Deliverable:** AI intelligence layer woven across all modules.

### Features

| Feature | Description |
|---|---|
| Reno Brain Chat | Conversational AI that knows your entire business |
| Natural Language Queries | Ask questions in plain language: "Show me overdue invoices this quarter" |
| AI Search | Smart search across all modules and records |
| AI Reports | Generate reports by describing them in plain language |
| AI Dashboards | Ask Brain to build you a dashboard |
| AI Workflow Builder | Describe a process, Brain creates the automation |
| AI Form Builder | Describe what data to collect, Brain builds the form |
| Forecasting Engine | Sales, inventory, cash flow, HR headcount forecasts |
| Smart Recommendations | Contextual suggestions at the right moment |
| Document Analysis | Summarize and extract key info from documents |
| Contract Analysis | Identify clauses, risks, and key dates in contracts |
| Meeting Summaries | Auto-summarize meetings and extract action items |
| Anomaly Detection | Flag unusual activity in finance, inventory, attendance |
| AI Agents | Role-specific agents: AI HR Director, AI Accountant, etc. |
| Voice Commands | Voice-activated queries and commands |
| Automation | AI-suggested automations based on observed patterns |
| Performance Analysis | AI insights on employee and team performance trends |
| AI Audit | Explain any change: "Why did this invoice get rejected?" |

### Key Entities
`ai_conversations`, `ai_messages`, `ai_message_context`, `ai_agent_sessions`, `ai_predictions`, `ai_prediction_results`, `ai_embeddings`, `ai_prompt_templates`, `ai_generated_items`, `ai_feedback`, `ai_usage_logs`

---

## Phase 11 — Reno Analytics

**Deliverable:** Executive dashboards, custom reports, and advanced forecasting center.

### Features

| Feature | Description |
|---|---|
| Executive Dashboard | C-level KPI overview: revenue, headcount, projects, cash |
| Finance Dashboard | P&L, cash position, AR/AP aging, budget vs. actual |
| HR Dashboard | Headcount, turnover, attendance rate, payroll cost |
| Sales Dashboard | Pipeline value, won/lost, revenue by rep, by product |
| Operations Dashboard | Project status, team utilization, open tickets |
| Custom Dashboard Builder | Drag-and-drop widgets, choose data sources, set filters |
| Custom Report Builder | Visual report designer with grouping, sorting, calculations |
| Saved Reports | Save, schedule, and share reports |
| Scheduled Reports | Auto-email reports on a schedule (daily/weekly/monthly) |
| Forecast Center | Revenue, inventory, headcount, and cash flow forecasts |
| KPI Manager | Define custom KPIs and track them over time |
| Data Export | Export any report to PDF, Excel, CSV |
| Comparison View | Current vs. previous period, actual vs. target |
| Drill-Down | Click any chart to see the underlying records |

### Key Entities
`bi_dashboards`, `bi_dashboard_widgets`, `bi_reports`, `bi_report_configs`, `bi_saved_filters`, `bi_kpis`, `bi_kpi_values`, `bi_scheduled_reports`, `bi_report_shares`

---

## Phase 12 — Reno Marketplace

**Deliverable:** App store for themes, plugins, integrations, and industry packs.

### Features

| Feature | Description |
|---|---|
| Theme Store | Browse and install pre-built themes |
| Plugin Store | Browse and install feature extensions |
| Integration Store | Connect to third-party apps (Slack, QuickBooks, Shopify, etc.) |
| Industry Pack Store | One-click install of vertical-specific module configurations |
| AI Agent Marketplace | Download additional AI agents |
| Developer Portal | SDK documentation, API keys, developer accounts |
| Plugin SDK | Standard interface for building plugins |
| Theme Builder | Visual editor for creating custom themes |
| Revenue Share | Marketplace revenue sharing for developers |
| Reviews & Ratings | Community ratings for marketplace items |
| Auto-Updates | Installed items auto-update with changelog |

### Key Entities
`mkt_items`, `mkt_item_versions`, `mkt_installations`, `mkt_reviews`, `mkt_developers`, `mkt_revenue_splits`, `mkt_integration_configs`

---

## Phase 13 — Industry Packs

**Deliverable:** Pre-configured module bundles and vertical-specific features for 10 industries.

| Industry | Additional Features |
|---|---|
| **Logistics** | Fleet management, route planning, delivery tracking, POD |
| **Tourism** | Booking engine, tour packages, guide management, seasonal pricing |
| **School** | Student enrollment, academic records, timetable, fee management |
| **Hospital** | Patient records, appointment scheduling, ward management, pharmacy |
| **Gym** | Member management, class scheduling, trainer assignments, check-in |
| **Construction** | Site management, subcontractor management, progress billing |
| **Manufacturing** | Bill of materials, work orders, production planning, quality control |
| **Retail** | POS integration, loyalty programs, store management |
| **Government** | Citizen services, compliance workflows, public records |
| **Real Estate** | Property listings, lease management, maintenance requests |

---

## Module Dependency Summary

```
Phase 0: Core Foundation
  ↓ (all modules depend on this)
Phase 1: HR
  ↓
Phase 2: Projects (uses HR for user/team data)
Phase 3: CRM (uses Core + HR)
  ↓
Phase 4: Sales (uses CRM + Inventory light reference)
Phase 5: Inventory (uses Core + Procurement light reference)
Phase 6: Procurement (uses Core + Inventory + Suppliers)
  ↓
Phase 7: Finance (integrates Sales, Procurement, HR/Payroll)
Phase 8: Documents (cross-cuts all — attachable to anything)
  ↓
Phase 9: Communication (uses Core + HR)
Phase 10: AI Brain (reads from all modules)
Phase 11: Analytics (aggregates from all modules)
  ↓
Phase 12: Marketplace (extends any module)
Phase 13: Industry Packs (configure existing modules)
```

---

**AWAITING OWNER APPROVAL BEFORE PROCEEDING TO DOCUMENT 5**
