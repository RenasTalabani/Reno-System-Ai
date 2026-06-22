# Reno System — Master Blueprint v1
## Document 6: UI/UX System

**Project:** Reno System  
**Owner:** Renas Talabani  
**Status:** DRAFT — Awaiting Owner Approval  
**Version:** 1.0.0  
**Date:** 2026-06-22  

---

## 1. Design Philosophy

Reno System's UI must feel like a product that belongs in the same category as Notion, Linear, and Vercel — not like a legacy ERP. The design prioritizes:

| Principle | Meaning |
|---|---|
| **Clarity over cleverness** | Users should never wonder what to do next |
| **Speed** | Every interaction feels instant — optimistic UI, skeleton loaders |
| **Density with breathing room** | Show enough data without visual overwhelm |
| **Consistency** | Same patterns everywhere — learn once, use everywhere |
| **Mobile First** | Every layout designed for 375px first, scaled up |
| **Accessible by default** | WCAG 2.1 AA compliance as a baseline |
| **White-label ready** | The entire visual identity is configurable per tenant |

---

## 2. Technology Stack — Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | SSR, SSG, streaming, layouts, server components |
| Language | TypeScript (strict mode) | Type safety across the entire codebase |
| Component Library | shadcn/ui (built on Radix UI primitives) | Accessible, headless, fully customizable |
| Styling | Tailwind CSS v4 | Utility-first, design token integration, tiny bundle |
| Animation | Framer Motion | Fluid page transitions, micro-interactions |
| Icons | Lucide React | Consistent, sharp, scalable icon set |
| Charts | Recharts / Nivo | Composable, responsive chart library |
| Tables | TanStack Table v8 | Virtualized, sortable, filterable data tables |
| Forms | React Hook Form + Zod | Type-safe forms with validation |
| Date/Time | date-fns | Lightweight, locale-aware, tree-shakeable |
| Drag & Drop | @dnd-kit | Accessible drag-and-drop (Kanban, builders) |
| Rich Text Editor | Tiptap | ProseMirror-based, extensible, markdown-compatible |
| PDF Preview | react-pdf | In-browser PDF rendering |
| Virtual Lists | TanStack Virtual | Smooth rendering of 10,000+ row lists |
| State Management | Zustand + TanStack Query | Server state (TQ) + local UI state (Zustand) |
| Real-time | Socket.io client | Chat, notifications, live updates |
| i18n | next-intl | Full internationalization with locale switching |

**Mobile (Flutter):**
- Flutter 3+ with Dart
- Material 3 design tokens mapped to Reno design system
- Riverpod for state management
- GoRouter for navigation
- Dio for HTTP
- Hive for offline storage
- flutter_secure_storage for token management

---

## 3. Design Tokens

Design tokens define the visual language. They are defined once and applied globally. White-label themes simply override the token values.

### 3.1 Color Tokens

```css
/* Brand (overridable by tenant) */
--color-brand-50:   #eef2ff;
--color-brand-100:  #e0e7ff;
--color-brand-500:  #6366f1;   /* Primary */
--color-brand-600:  #4f46e5;   /* Primary hover */
--color-brand-700:  #4338ca;   /* Primary active */
--color-brand-900:  #312e81;

/* Semantic */
--color-success:    #22c55e;
--color-warning:    #f59e0b;
--color-danger:     #ef4444;
--color-info:       #3b82f6;

/* Neutral (backgrounds, borders, text) */
--color-neutral-0:   #ffffff;
--color-neutral-50:  #f8fafc;
--color-neutral-100: #f1f5f9;
--color-neutral-200: #e2e8f0;
--color-neutral-300: #cbd5e1;
--color-neutral-400: #94a3b8;
--color-neutral-500: #64748b;
--color-neutral-600: #475569;
--color-neutral-700: #334155;
--color-neutral-800: #1e293b;
--color-neutral-900: #0f172a;
--color-neutral-950: #020617;

/* Surface */
--surface-base:     var(--color-neutral-0);
--surface-raised:   var(--color-neutral-50);
--surface-overlay:  var(--color-neutral-0);
--surface-sunken:   var(--color-neutral-100);
```

### 3.2 Typography Tokens

```css
--font-family-base:    'Inter', sans-serif;
--font-family-mono:    'JetBrains Mono', monospace;

--font-size-xs:   0.75rem;   /* 12px */
--font-size-sm:   0.875rem;  /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg:   1.125rem;  /* 18px */
--font-size-xl:   1.25rem;   /* 20px */
--font-size-2xl:  1.5rem;    /* 24px */
--font-size-3xl:  1.875rem;  /* 30px */
--font-size-4xl:  2.25rem;   /* 36px */

--font-weight-normal:  400;
--font-weight-medium:  500;
--font-weight-semibold: 600;
--font-weight-bold:    700;

--line-height-tight:  1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### 3.3 Spacing Tokens

```css
/* 4px base grid */
--spacing-1:  4px;
--spacing-2:  8px;
--spacing-3:  12px;
--spacing-4:  16px;
--spacing-5:  20px;
--spacing-6:  24px;
--spacing-8:  32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
--spacing-20: 80px;
--spacing-24: 96px;
```

### 3.4 Border Radius Tokens

```css
--radius-sm:   4px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-xl:   16px;
--radius-2xl:  24px;
--radius-full: 9999px;
```

### 3.5 Shadow Tokens

```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 4px 6px -1px rgba(0,0,0,0.1);
--shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.1);
--shadow-xl:  0 20px 25px -5px rgba(0,0,0,0.1);
```

---

## 4. Theme System

### 4.1 Available Themes

| Theme | Description | Primary Use Case |
|---|---|---|
| **Light** | Clean white background, neutral grays | General business |
| **Dark** | Deep slate background, light text | Developer-heavy teams, night use |
| **Corporate** | Navy + gold accents, formal layout | Enterprise, finance, government |
| **Glassmorphism** | Frosted glass cards, gradient accents | Modern startups, tech companies |
| **Minimal** | Maximum whitespace, minimal chrome | Design-conscious teams |
| **Healthcare** | Calm blues and greens, clinical | Hospital, clinic, medical |
| **Education** | Warm oranges and yellows, friendly | Schools, training, LMS |
| **Logistics** | Industrial grays + safety orange | Warehouses, transportation |
| **Custom** | Tenant builds their own via Theme Builder | White-label customers |

### 4.2 Theme Implementation

Themes are implemented as CSS variable overrides on `:root`. Switching theme = applying a new class to `<html>`:

```html
<html class="theme-dark" data-theme="dark">
```

```css
.theme-dark {
  --surface-base: var(--color-neutral-950);
  --surface-raised: var(--color-neutral-900);
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-400);
  --color-border: var(--color-neutral-800);
}
```

### 4.3 White-Label Customization (Per Tenant)

Tenants can customize from **Settings → Branding**:

| Setting | Type |
|---|---|
| App name | Text (replaces "Reno System") |
| Logo (light background) | Image upload |
| Logo (dark background) | Image upload |
| Favicon | Image upload |
| Primary color | Color picker |
| Secondary color | Color picker |
| Accent color | Color picker |
| Font family | Select from Google Fonts |
| Base theme | Select from available themes |
| Custom CSS | Text area for advanced overrides |
| Login page background | Image or gradient |
| Custom domain | Text (requires DNS setup) |

---

## 5. Application Layout

### 5.1 Master Layout (Web & Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ [SIDEBAR — 240px]              [MAIN CONTENT AREA]              │
│ ┌──────────────────┐          ┌───────────────────────────────┐ │
│ │ [Logo]  [Tenant] │          │ [TOP BAR]                     │ │
│ │──────────────────│          │ Page title  [Search] [+] [🔔] │ │
│ │ [User Avatar]    │          │ [Breadcrumb / Tabs]           │ │
│ │ [User Name]      │          ├───────────────────────────────┤ │
│ │──────────────────│          │                               │ │
│ │ ▾ Core           │          │  PAGE CONTENT AREA            │ │
│ │   Dashboard      │          │                               │ │
│ │   Notifications  │          │  (Tables, Forms, Charts,      │ │
│ │──────────────────│          │   Kanban, Calendar, etc.)     │ │
│ │ ▾ HR             │          │                               │ │
│ │   Employees      │          │                               │ │
│ │   Attendance     │          │                               │ │
│ │   Leave          │          │                               │ │
│ │   Payroll        │          │                               │ │
│ │──────────────────│          │                               │ │
│ │ ▾ CRM            │          │                               │ │
│ │   ...            │          │                               │ │
│ │──────────────────│          │                               │ │
│ │ [Settings]       │          │                               │ │
│ │ [Help]           │          └───────────────────────────────┘ │
│ └──────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Sidebar Behavior

- **Desktop (>1280px):** Always visible, 240px wide
- **Tablet (768–1280px):** Collapsed to 64px icon-only mode by default
- **Mobile (<768px):** Hidden, triggered by hamburger → slides in as overlay
- **Collapsible:** User can pin open or collapse with a toggle
- **Module sections:** Grouped, collapsible, with active state highlighting
- **Context-aware:** Shows only modules enabled for the tenant

### 5.3 Top Bar

```
Left:  [≡ Collapse] [Page Title + Breadcrumb]
Right: [Global Search ⌘K] [+ Quick Create] [🔔 Notifications] [? Help] [Avatar Menu]
```

- **Quick Create button:** Context-aware — shows relevant "new" actions for current module
- **Global Search (⌘K):** Command palette — search records, navigate modules, trigger actions

### 5.4 Command Palette (⌘K / Ctrl+K)

```
┌────────────────────────────────────────┐
│ 🔍 Search or type a command...         │
├────────────────────────────────────────┤
│ Recent                                  │
│  👤 Ahmed Al-Rashidi — Employee         │
│  📋 Q-2026-0847 — Quote                 │
│  📁 Website Redesign — Project          │
├────────────────────────────────────────┤
│ Quick Actions                           │
│  + New Employee                         │
│  + New Lead                             │
│  + New Task                             │
│  + New Invoice                          │
├────────────────────────────────────────┤
│ Ask Reno Brain                          │
│  "Show me overdue invoices..."          │
└────────────────────────────────────────┘
```

---

## 6. Core UI Components

### 6.1 Data Table

```
Features:
  ✓ Column sorting (click header)
  ✓ Column resizing (drag handle)
  ✓ Column reordering (drag column)
  ✓ Column visibility toggle
  ✓ Multi-row selection (checkbox)
  ✓ Bulk actions on selection
  ✓ Inline row actions (⋯ menu)
  ✓ Row click → detail view
  ✓ Sticky header
  ✓ Frozen first column (for wide tables)
  ✓ Virtualization (10,000+ rows smooth)
  ✓ Export to CSV / Excel / PDF
  ✓ Filter panel (advanced filters)
  ✓ Search bar
  ✓ Saved filter presets
  ✓ Pagination controls (or infinite scroll option)
  ✓ Loading skeleton (not spinner)
  ✓ Empty state illustration
```

### 6.2 Form Components

```
TextInput         — with label, helper text, error state
TextArea          — auto-resize, character count
NumberInput       — with increment/decrement, currency formatting
Select            — searchable, creatable, async-load options
MultiSelect       — tag-style selection with search
DatePicker        — calendar + manual entry, range support
TimePicker        — hour/minute/AM-PM
DateTimePicker    — combined date + time
FileUpload        — drag-and-drop, multi-file, progress, preview
RichTextEditor    — Tiptap with toolbar
ColorPicker       — HEX/RGB/HSL, palette presets
Switch/Toggle     — accessible boolean
Checkbox          — single and group
RadioGroup        — accessible radio buttons
Slider            — single and range
PhoneInput        — country code + number, formatted
AddressInput      — structured address with country-aware fields
CurrencyInput     — currency symbol + formatting
SearchInput       — debounced live search
```

### 6.3 Layout Components

```
Card              — surface container with optional header/footer
Modal / Dialog    — centered overlay, keyboard-accessible
Sheet / Drawer    — side panel (right/left), for detail views
Popover           — floating content anchored to trigger
Tooltip           — hover hint
DropdownMenu      — context menus, action menus
Tabs              — horizontal and vertical tab navigation
Accordion         — collapsible content sections
Separator         — visual dividers
Skeleton          — loading placeholders (always over spinners)
EmptyState        — illustrated empty state with CTA
ErrorState        — error display with retry action
```

### 6.4 Feedback Components

```
Toast / Notification   — success, error, warning, info (top-right)
Alert Banner           — inline warning/info/success
Progress Bar           — determinate and indeterminate
Badge                  — status chips, count badges
Avatar                 — user photo with initials fallback
AvatarGroup            — stacked user avatars
StatusDot              — colored indicator dot
```

### 6.5 Navigation Components

```
Breadcrumb         — page location trail
Pagination         — prev/next/page numbers
Stepper            — multi-step form progress
SidebarNav         — module navigation
TabNav             — sub-page navigation
```

---

## 7. Page Patterns

### 7.1 List Page (Standard)

```
[Page Title]                              [+ New Button]
[Search Bar]  [Filters]  [Sort]  [View Toggle: ☰ List / ⊞ Grid / 📋 Kanban]
─────────────────────────────────────────────────────────
[Data Table or Card Grid]
─────────────────────────────────────────────────────────
[Pagination]
```

### 7.2 Detail Page (Standard)

```
[← Back]  [Record Name / ID]                [Edit] [⋯ More Actions]
─────────────────────────────────────────────────────────
[Tabs: Overview | Activity | Documents | Notes | ...]
─────────────────────────────────────────────────────────
[Main Content]                    [Right Sidebar]
  Key fields                        Status / Stage
  Related records                   Assigned to
  Timeline                          Tags
  Documents                         Quick actions
```

### 7.3 Form Page (Create / Edit)

```
[Page Title: New Employee]
─────────────────────────────────────────────────────────
[Section: Personal Information]
  [First Name] [Last Name]
  [Email]      [Phone]
  [Date of Birth] [Gender]

[Section: Employment Details]
  [Department] [Branch]
  [Job Title]  [Start Date]
  [Employment Type]

[Section: Salary]
  [Salary Structure] [Basic Salary]

─────────────────────────────────────────────────────────
                              [Cancel]  [Save Draft]  [Save]
```

### 7.4 Dashboard / Analytics Page

```
[Page Title: HR Dashboard]     [Date Range Picker]  [Refresh]
─────────────────────────────────────────────────────────
[KPI Row: 4 metric cards side by side]
  Total Employees  |  New Hires  |  Attendance Rate  |  Open Leaves

[Charts Row]
  [Attendance Trend — Line Chart]  [Leave by Type — Donut]

[Tables Row]
  [Upcoming Leave Calendar]        [Recent Hires Table]
```

### 7.5 Kanban Page

```
[Project Name]  [+ Add Task]  [Filter]  [Group By]  [Members]
─────────────────────────────────────────────────────────
[To Do]           [In Progress]       [Review]        [Done]
─────────────────────────────────────────────────────────
[Task Card]       [Task Card]         [Task Card]     [Task Card]
  Title             Title               Title           Title
  Assignee          Assignee+Progress   Assignee        Assignee
  Due date          Due date            Due date        Due date
  Labels            Labels              Labels          Labels
[+ Add card]      [+ Add card]        [+ Add card]    [+ Add card]
```

---

## 8. Mobile Layout (Flutter)

### 8.1 Navigation Pattern

```
Bottom Navigation Bar (primary — 4-5 tabs):
  [Home/Dashboard] [Module 1] [+ Quick Add] [Module 2] [Profile]

Stack Navigation for depth:
  List → Detail → Edit → Sub-detail
```

### 8.2 Mobile-Specific Patterns

- **Pull to refresh** on all list views
- **Swipe actions** on list items (swipe left: archive/delete, swipe right: quick action)
- **Bottom sheets** instead of modals for actions
- **Floating Action Button** for primary action per screen
- **Offline banner** when connectivity is lost
- **Biometric authentication** (Face ID / fingerprint) for login
- **Push notifications** for approvals, mentions, alerts

### 8.3 Offline Support

| Data | Offline Behavior |
|---|---|
| My tasks | Cached, editable offline, sync on reconnect |
| My attendance | Can check in/out offline, syncs on reconnect |
| My leave requests | Cached, can submit offline |
| Notifications | Cached and readable offline |
| Employee directory | Cached (last 24h) |
| Financial data | Read-only from cache, no offline edits |

---

## 9. Accessibility Standards

| Standard | Requirement |
|---|---|
| WCAG Level | 2.1 AA minimum |
| Keyboard Navigation | All interactions accessible via keyboard |
| Focus Management | Visible focus ring on all interactive elements |
| Screen Reader | Proper ARIA labels, roles, and live regions |
| Color Contrast | 4.5:1 for normal text, 3:1 for large text |
| Color Independence | Information never conveyed by color alone |
| Animation | Respects `prefers-reduced-motion` |
| Font Size | Minimum 14px for body text |
| Touch Targets | Minimum 44×44px on mobile |
| Error Messages | Always associated with the specific field |

---

## 10. Responsive Breakpoints

```
xs:  < 375px     (small phones)
sm:  375px–640px (phones)
md:  640px–768px (large phones / small tablets)
lg:  768px–1024px (tablets)
xl:  1024px–1280px (small desktops / landscape tablets)
2xl: 1280px–1536px (standard desktops)
3xl: > 1536px   (large monitors — power user layout)
```

---

## 11. Loading States

**Rule:** Never use a full-page spinner. Always use skeleton loaders that match the shape of the content.

```
Page load          → Skeleton layout matching the page structure
Table data load    → Skeleton rows (5–10 visible rows)
Chart data load    → Skeleton chart area with animated shimmer
Form submit        → Button loading state + disable all fields
Infinite scroll    → Skeleton rows at bottom of list
Image load         → Blurred placeholder → actual image
```

---

## 12. Empty States

Every list/data view has a designed empty state:

```
┌─────────────────────────────────────┐
│                                     │
│      [Illustration]                 │
│                                     │
│   No employees found                │
│   Add your first employee to        │
│   get started.                      │
│                                     │
│         [+ Add Employee]            │
│                                     │
└─────────────────────────────────────┘
```

Empty state types:
- **First use** (no data yet) — welcoming, action-forward
- **Search/filter empty** — "No results for X" — clear filters CTA
- **Permission empty** — "You don't have access to this" — no CTA
- **Error state** — "Something went wrong" — retry CTA

---

## 13. Reno Brain AI UI

Reno Brain is accessible from anywhere in the app:

### 13.1 Access Points

- **Bottom-right floating button:** Brain icon — opens chat panel
- **⌘K command palette:** Type a question → routes to Brain
- **In-context suggestions:** Brain icon appears in relevant contexts (e.g., "Ask Brain to analyze this payroll run")
- **Dashboard widgets:** Brain-generated insights widgets
- **Voice:** Hold-to-talk button in mobile app

### 13.2 Chat Panel Layout

```
┌──────────────────────────────────┐
│ Reno Brain                  [✕]  │
│ ──────────────────────────────── │
│ [Brain]:                         │
│  Hi! I know your entire business.│
│  What would you like to know?    │
│                                  │
│ [User]:                          │
│  Show me employees with 3+ sick  │
│  days this month                 │
│                                  │
│ [Brain]:                         │
│  Here are 4 employees:           │
│  ┌──────────────────────────┐   │
│  │ Name     Dept   Days     │   │
│  │ Sara K.  HR     5        │   │
│  │ Ali M.   IT     4        │   │
│  └──────────────────────────┘   │
│  [View in HR Module →]          │
│                                  │
│ ──────────────────────────────── │
│ [Type a message...]    [🎤] [➤] │
└──────────────────────────────────┘
```

---

## 14. Component Library Delivery

The shared component library is in `packages/ui/`:

```
packages/ui/
├── components/
│   ├── data-display/        # Table, Card, Badge, Avatar, Stat
│   ├── forms/               # All form inputs
│   ├── layout/              # Modal, Sheet, Tabs, Accordion
│   ├── navigation/          # Sidebar, Breadcrumb, Tabs, Pagination
│   ├── feedback/            # Toast, Alert, Progress, Skeleton
│   └── charts/              # Chart wrappers (Recharts/Nivo)
├── hooks/
│   ├── useTable.ts          # Table state management
│   ├── useForm.ts           # Form utilities
│   ├── useToast.ts          # Toast notifications
│   └── useDebounce.ts       # Search debounce
├── tokens/
│   ├── colors.ts            # Design token definitions
│   ├── typography.ts
│   └── spacing.ts
├── themes/
│   ├── light.css
│   ├── dark.css
│   ├── corporate.css
│   └── glassmorphism.css
└── index.ts                 # Single export point
```

---

**AWAITING OWNER APPROVAL BEFORE PROCEEDING TO PHASE 0 DEVELOPMENT**
