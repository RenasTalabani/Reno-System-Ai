import { config as loadEnv } from 'dotenv'
import path from 'node:path'

// Load root .env — try repo root (../../ from apps/api/) then local fallback
loadEnv({ path: path.resolve(process.cwd(), '../../.env'), override: false })
loadEnv({ path: path.resolve(process.cwd(), '.env'), override: false })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import compress from '@fastify/compress'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { logger } from '@reno/logger'
import { prisma } from '@reno/database'
import { registerRoutes } from './rest/routes/index.js'
import { errorHandler } from './rest/middleware/error-handler.js'
import { disconnectCache } from './cache/index.js'
import { startJobProcessor, stopJobProcessor } from './jobs/processor.js'
import { startKpiCollector, stopKpiCollector } from './observability/kpi-collector.js'
import { installSlowQueryMonitor } from './observability/slow-query.js'
import { initTracing, shutdownTracing } from './observability/tracing.js'
import { startBackupScheduler, stopBackupScheduler } from './backup/backup.scheduler.js'
import {
  registry,
  httpRequestsTotal,
  httpErrorsTotal,
  httpRequestDuration,
  normalizeRoute,
} from './observability/metrics.js'

const PORT = parseInt(process.env['PORT'] ?? '4000', 10)
const HOST = process.env['HOST'] ?? '0.0.0.0'

// Initialize distributed tracing before Fastify loads
initTracing()

// Install Prisma slow-query monitoring
installSlowQueryMonitor()

async function bootstrap() {
  const app = Fastify({
    logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: true,
  })

  // ─── OpenAPI / Swagger ──────────────────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Reno System API',
        description: 'AI-native Business Operating System — REST API reference.\n\nAuthenticate with `Authorization: Bearer <jwt>` or `X-API-Key: <key>`.',
        version: '1.0.0',
        contact: { name: 'Reno Support', email: 'api@reno.app' },
        license: { name: 'Proprietary' },
      },
      externalDocs: { description: 'Developer Portal', url: '/developer' },
      servers: [
        { url: '/v1', description: 'Current version' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          ApiKeyHeader: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      },
      security: [{ BearerAuth: [] }, { ApiKeyHeader: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication & session management' },
        { name: 'Users', description: 'User management' },
        { name: 'Org', description: 'Organization, companies, branches' },
        { name: 'HR', description: 'Human resources — employees, attendance, leave, payroll' },
        { name: 'Projects', description: 'Project & task management' },
        { name: 'CRM', description: 'Customer relationship management' },
        { name: 'Sales', description: 'Sales orders, quotes, invoices' },
        { name: 'Finance', description: 'Accounting, budgets, reports' },
        { name: 'Inventory', description: 'Products, warehouses, stock' },
        { name: 'Procurement', description: 'Purchase orders, suppliers' },
        { name: 'Manufacturing', description: 'Production, BOM, work orders' },
        { name: 'Analytics', description: 'KPIs, dashboards, forecasts' },
        { name: 'Brain', description: 'Reno AI Brain — natural language queries, insights' },
        { name: 'Automation', description: 'Workflows, triggers, approvals' },
        { name: 'Helpdesk', description: 'Service desk, tickets, SLA' },
        { name: 'Documents', description: 'Document management, OCR, e-signatures' },
        { name: 'Knowledge Base', description: 'KB articles, categories' },
        { name: 'Comm', description: 'Communication — messages, announcements, meetings' },
        { name: 'Portal', description: 'Customer & employee self-service portals' },
        { name: 'Marketplace', description: 'Plugin & theme marketplace' },
        { name: 'Security', description: 'Security events, sessions, IP allowlist' },
        { name: 'Monitoring', description: 'Health, metrics, web vitals, AI monitor' },
        { name: 'Backup', description: 'Backup jobs, snapshots, restore' },
        { name: 'DR', description: 'Disaster recovery — playbooks, readiness, RTO/RPO' },
        { name: 'AI SRE', description: 'AI Site Reliability Engineer — incidents, forecasts' },
        { name: 'Deployment', description: 'Deployment audit log, environment validation' },
        { name: 'Developer', description: 'Developer platform — API keys, webhooks, sandbox' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  })

  // ─── Response Compression ───────────────────────────────────────────────────
  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ['br', 'gzip', 'deflate'],
  })

  // ─── Security ───────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })

  await app.register(cors, {
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID', 'X-API-Key'],
  })

  await app.register(rateLimit, {
    max: parseInt(process.env['RATE_LIMIT_MAX'] ?? '1000', 10),
    timeWindow: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '900000', 10),
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
    }),
  })

  await app.register(cookie)

  // ─── Prometheus Instrumentation Hook ────────────────────────────────────────
  app.addHook('onResponse', async (request, reply) => {
    const route = normalizeRoute(request.routeOptions?.url ?? request.url)
    const method = request.method
    const status = String(reply.statusCode)
    const durationSec = reply.elapsedTime / 1000

    httpRequestsTotal.inc({ method, route, status_code: status })
    httpRequestDuration.observe({ method, route }, durationSec)

    if (reply.statusCode >= 500) {
      httpErrorsTotal.inc({ method, route })
    }
  })

  // ─── Correlation ID propagation ─────────────────────────────────────────────
  app.addHook('onRequest', async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] ?? request.id
    reply.header('x-correlation-id', correlationId)
    reply.header('x-request-id', request.id)
  })

  // ─── Error Handler ──────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler as Parameters<typeof app.setErrorHandler>[0])

  // ─── REST Routes ────────────────────────────────────────────────────────────
  await registerRoutes(app)

  // ─── Health Checks ──────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'reno-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
    uptime: Math.round(process.uptime()),
  }))

  app.get('/health/db', async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  })

  // ─── Prometheus Metrics Endpoint ────────────────────────────────────────────
  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', registry.contentType)
    return registry.metrics()
  })

  // ─── Metrics as JSON ────────────────────────────────────────────────────────
  app.get('/metrics/json', async () => ({
    uptime: Math.round(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    metrics: await registry.getMetricsAsJSON(),
  }))

  // ─── Background Jobs ────────────────────────────────────────────────────────
  startJobProcessor()

  // ─── KPI Collector ──────────────────────────────────────────────────────────
  startKpiCollector()

  // ─── Backup Scheduler ───────────────────────────────────────────────────────
  startBackupScheduler()

  // ─── Start ───────────────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: HOST })

  logger.info(`
  ╔═══════════════════════════════════════════╗
  ║        Reno System API v0.1.0             ║
  ╠═══════════════════════════════════════════╣
  ║  REST:       http://localhost:${PORT}/v1      ║
  ║  Health:     http://localhost:${PORT}/health  ║
  ║  Metrics:    http://localhost:${PORT}/metrics ║
  ║  Docs:       http://localhost:${PORT}/docs    ║
  ║  OpenAPI:    http://localhost:${PORT}/docs/json ║
  ║  Grafana:    http://localhost:3001         ║
  ║  Prometheus: http://localhost:9090         ║
  ║  Env:        ${(process.env['NODE_ENV'] ?? 'development').padEnd(12)}               ║
  ╚═══════════════════════════════════════════╝
  `)
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`)
  stopJobProcessor()
  stopKpiCollector()
  stopBackupScheduler()
  await Promise.all([
    prisma.$disconnect(),
    disconnectCache(),
    shutdownTracing(),
  ])
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start API server')
  process.exit(1)
})
