# Reno System — AI Usage Guide v1.0.0

---

## Overview

Reno Brain is the AI core of Reno System. It operates across every module, learns from your business data, and evolves over time. This guide explains how to use, configure, and maximize the value of all AI capabilities.

---

## Core AI Principles

1. **Real data only** — every AI recommendation and briefing is generated from actual records in your system, never fabricated
2. **Evidence required** — every recommendation includes the data points that led to it
3. **Human approval mandatory** — AI never executes critical actions without a human decision
4. **Per-tenant isolation** — Brain's memory, learning, and recommendations are completely separate per tenant
5. **Continuous improvement** — Brain learns from every approval, rejection, and implementation outcome

---

## AI Assistant (Floating Button)

The floating Brain assistant appears on every page. It maintains context of the current screen.

### Usage
Click the blue floating button (bottom-right) or press `Alt+B`:
- "Summarize what's on this screen"
- "What actions can I take here?"
- "Find invoices from last week"
- "Create a leave request for next Monday"
- "Alert me when this ticket is updated"

### Context Awareness
Brain knows:
- Which module/page you're on
- Recent records you've viewed
- Your role and permissions
- Your tenant's current business state (briefing data)

---

## Daily Briefing

Navigate to **Brain → Daily Briefing** (or see the widget on your Dashboard).

Generated fresh each morning from:
- Open helpdesk tickets (urgent/high priority)
- Pending brain actions requiring approval
- Active projects (in_progress)
- Outstanding invoices (draft/sent)
- Active CRM opportunities
- Recent AI lessons learned
- Pending executive recommendations

**Business Mood** is automatically derived:
- Excellent — very few high-priority insights
- Good — minor issues, mostly healthy
- Stable — steady state, nothing urgent
- Cautious — several issues need attention
- Critical — multiple high-priority items requiring immediate action

---

## Recommendations

Brain proactively generates recommendations across all modules.

### Viewing Recommendations
- **Brain → Recommendations** — full list
- **Dashboard widget** — top 3 pending
- **Per-module sidebars** — contextual recommendations

### Understanding a Recommendation
Each recommendation includes:
- **Title** — what Brain is suggesting
- **Evidence** — the actual data points from your system
- **Confidence** — 0–100% how confident Brain is
- **Impact** — estimated business impact (low/medium/high/critical)
- **Module** — which area of the business this applies to

### Acting on Recommendations
- **Accept** — you agree and will act on it; Brain notes this as positive signal
- **Reject** — you disagree; Brain asks for a reason to learn from
- **Ignore** — not relevant right now; tracked but no learning signal

All outcomes feed into Brain's accuracy metrics.

---

## Executive Reports

**Brain → Executive** — AI-generated reports by role:

| Report | Audience | Frequency |
|---|---|---|
| CEO Report | CEO | Daily |
| CFO Report | CFO / Finance | Daily |
| COO Report | COO / Operations | Daily |
| CMO Report | CMO / Marketing | Daily |
| CTO Report | CTO / Technology | Daily |

Each report uses real data from the relevant modules and presents KPIs, trends, risks, and recommended actions.

---

## Board Meeting Simulator

**Brain → Board Meeting** — simulate an AI executive board session.

### How It Works
1. Enter a **session name** and **agenda** (strategic topics, decisions, challenges)
2. Brain populates 5 executive personas: CEO, CFO, COO, CMO, CTO
3. Click **Run Simulation**
4. Brain generates:
   - A full discussion thread (each persona contributes)
   - Decisions per agenda item
   - Action items with owners
   - Key conflicts between executives
   - A consensus statement

### Personas
- **CEO** — growth-focused, strategic, long-term vision
- **CFO** — conservative, data-driven, risk-aware
- **COO** — execution-focused, process-oriented
- **CMO** — customer-centric, brand-focused
- **CTO** — innovation-driven, technical depth

### Important
Board simulation decisions are advisory only. No action is ever executed automatically.

---

## Business Memory

**Brain → Memory** — AI's long-term knowledge about your business.

### Memory Types
| Type | What It Stores |
|---|---|
| company | Facts about your company, strategy, culture |
| customer | Key insights about customers |
| supplier | Supplier reliability, terms, incidents |
| employee | Skills, performance patterns, preferences |
| project | Lessons, risks, outcomes from past projects |
| financial | Financial trends, budget patterns, anomalies |
| incident | Recorded incidents and root causes |
| decision | Strategic decisions and their rationale |

### Adding a Memory
1. **Brain → Memory → Add Memory**
2. Select memory type, entity (if applicable), and enter content
3. Add evidence (data points that support this memory)
4. Set importance (1–10) and confidence (0–100%)

Brain also creates memories automatically from:
- Implemented recommendations
- Board simulation decisions
- AI lesson extraction

### Memory in Context
When you view a customer, project, or employee, Brain surfaces relevant memories in the sidebar, giving you instant context without manual searching.

---

## Semantic Search

**Brain → Search** — find records using natural language.

### Examples
- "invoices from Acme Corp with payment delays"
- "high-risk projects close to deadline"
- "employee leave patterns in Q3"
- "supplier incidents affecting manufacturing"

### How It Works
1. Query is vectorized using the configured AI model
2. Cosine similarity search across all indexed content
3. Keyword fallback for coverage
4. Results ranked by relevance

### Indexed Content
- Knowledge base articles
- Business memories
- AI lessons learned
- (Expandable to all entity types via embedding indexing)

---

## AI Learning & Accuracy

**Brain → Accuracy** — track how well Brain's recommendations are performing.

### Metrics
- **Acceptance Rate** — % of recommendations accepted
- **Implementation Rate** — % of accepted recommendations implemented
- **Accuracy Rate** — % of predictions that proved correct
- **Average Confidence** — Brain's self-assessed confidence average

Metrics are tracked at daily, weekly, and monthly granularity.

### Feedback Loop
Every time you:
- Accept a recommendation → Brain reinforces the pattern
- Reject with reason → Brain learns what NOT to recommend
- Mark as implemented → Brain extracts a lesson
- Mark as failed → Brain extracts a lesson and reduces future confidence for similar patterns

Over time, Brain's accuracy rate should improve as it learns your organization's preferences, constraints, and context.

---

## AI Predictions

**Brain → Predictions** — forward-looking business predictions.

Predictions include:
- Predicted value vs. actual (tracked after the fact)
- Confidence interval
- Key drivers (evidence-based)
- Recommended actions if the prediction is unfavorable

All predictions are tagged for post-hoc accuracy tracking.

---

## AI Configuration

**Settings → AI**

| Setting | Default | Description |
|---|---|---|
| AI Provider | OpenAI | Primary AI model provider |
| AI Model | GPT-4 | Model used for recommendations |
| Auto-briefing | Enabled | Auto-generate daily briefing at 07:00 |
| Confidence Threshold | 70% | Minimum confidence to show recommendation |
| Human Approval Required | Always | Never auto-execute AI actions |
| Memory Retention | Unlimited | Memories never auto-expire |

### Bring Your Own Key
Add your own AI provider API key in **Settings → AI → API Keys** to use your own billing and model access.

---

## Privacy & Data Handling

- All AI processing uses tenant-scoped data only
- No tenant data is ever shared with another tenant
- AI training on your data: Brain learns from your feedback within your tenant's memory only
- External AI provider (OpenAI/Anthropic): data is sent to generate responses; review the provider's data processing agreement
- Audit log: all AI actions are logged in `sys_audit_logs`
