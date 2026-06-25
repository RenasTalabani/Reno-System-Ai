/**
 * Reno Observability — prom-client Metrics Registry
 * Phase 24: Observability & Monitoring Platform
 *
 * Replaces the custom in-server map with proper Prometheus counters,
 * histograms, and gauges that Grafana can scrape and visualize.
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'

// ─── Registry ─────────────────────────────────────────────────────────────────

export const registry = new Registry()
registry.setDefaultLabels({ service: 'reno-api' })

// Collect Node.js default metrics (heap, GC, event loop, CPU)
collectDefaultMetrics({ register: registry, prefix: 'reno_nodejs_' })

// ─── HTTP Metrics ─────────────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'reno_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
})

export const httpErrorsTotal = new Counter({
  name: 'reno_http_errors_total',
  help: 'Total number of HTTP 5xx errors',
  labelNames: ['method', 'route'],
  registers: [registry],
})

export const httpRequestDuration = new Histogram({
  name: 'reno_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
})

// ─── API Uptime ───────────────────────────────────────────────────────────────

const apiStartTime = Date.now()
export const apiUptime = new Gauge({
  name: 'reno_api_uptime_seconds',
  help: 'API process uptime in seconds',
  registers: [registry],
  collect() {
    this.set(Math.round((Date.now() - apiStartTime) / 1000))
  },
})

// ─── Process Memory ───────────────────────────────────────────────────────────

export const processHeapBytes = new Gauge({
  name: 'reno_process_heap_bytes',
  help: 'V8 heap memory used in bytes',
  registers: [registry],
  collect() {
    this.set(process.memoryUsage().heapUsed)
  },
})

export const processHeapTotalBytes = new Gauge({
  name: 'reno_process_heap_total_bytes',
  help: 'V8 heap memory total in bytes',
  registers: [registry],
  collect() {
    this.set(process.memoryUsage().heapTotal)
  },
})

export const processRssBytes = new Gauge({
  name: 'reno_process_rss_bytes',
  help: 'Process RSS memory in bytes',
  registers: [registry],
  collect() {
    this.set(process.memoryUsage().rss)
  },
})

// ─── Cache Metrics ────────────────────────────────────────────────────────────

export const cacheHitsTotal = new Counter({
  name: 'reno_cache_hits_total',
  help: 'Total Redis cache hits',
  labelNames: ['key_prefix'],
  registers: [registry],
})

export const cacheMissesTotal = new Counter({
  name: 'reno_cache_misses_total',
  help: 'Total Redis cache misses',
  labelNames: ['key_prefix'],
  registers: [registry],
})

export const cacheErrorsTotal = new Counter({
  name: 'reno_cache_errors_total',
  help: 'Total Redis cache errors',
  registers: [registry],
})

// ─── Database Metrics ─────────────────────────────────────────────────────────

export const dbQueryDuration = new Histogram({
  name: 'reno_db_query_duration_seconds',
  help: 'Prisma query execution time in seconds',
  labelNames: ['model', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
})

export const dbSlowQueriesTotal = new Counter({
  name: 'reno_db_slow_queries_total',
  help: 'Queries exceeding 500ms slow-query threshold',
  labelNames: ['model', 'operation'],
  registers: [registry],
})

// ─── Background Job Metrics ───────────────────────────────────────────────────

export const jobsPendingTotal = new Gauge({
  name: 'reno_jobs_pending_total',
  help: 'Current number of pending background jobs',
  registers: [registry],
})

export const jobsCompletedTotal = new Counter({
  name: 'reno_jobs_completed_total',
  help: 'Total background jobs completed',
  labelNames: ['queue', 'type'],
  registers: [registry],
})

export const jobsFailedTotal = new Counter({
  name: 'reno_jobs_failed_total',
  help: 'Total background jobs permanently failed',
  labelNames: ['queue', 'type'],
  registers: [registry],
})

export const jobDuration = new Histogram({
  name: 'reno_job_duration_seconds',
  help: 'Background job execution time in seconds',
  labelNames: ['queue', 'type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [registry],
})

// ─── Session / Auth Metrics ───────────────────────────────────────────────────

export const activeSessionsTotal = new Gauge({
  name: 'reno_active_sessions_total',
  help: 'Current number of active sessions',
  registers: [registry],
})

export const authFailuresTotal = new Counter({
  name: 'reno_auth_failures_total',
  help: 'Total failed authentication attempts',
  labelNames: ['reason'],
  registers: [registry],
})

// ─── Distributed Tracing Metrics ─────────────────────────────────────────────

export const traceSpansTotal = new Counter({
  name: 'reno_trace_spans_total',
  help: 'Total OpenTelemetry spans created',
  registers: [registry],
})

export const activeSpans = new Gauge({
  name: 'reno_active_spans',
  help: 'Current number of active trace spans',
  registers: [registry],
})

// ─── Business KPI Metrics ─────────────────────────────────────────────────────

export const kpiTotalUsers = new Gauge({
  name: 'reno_kpi_total_users',
  help: 'Total active users across all tenants',
  registers: [registry],
})

export const kpiTotalEmployees = new Gauge({
  name: 'reno_kpi_total_employees',
  help: 'Total employees across all tenants',
  registers: [registry],
})

export const kpiTotalContacts = new Gauge({
  name: 'reno_kpi_total_contacts',
  help: 'Total CRM contacts across all tenants',
  registers: [registry],
})

export const kpiOpenTickets = new Gauge({
  name: 'reno_kpi_open_tickets',
  help: 'Total open helpdesk tickets across all tenants',
  registers: [registry],
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeRoute(url: string): string {
  return url
    .split('?')[0]!
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
}
