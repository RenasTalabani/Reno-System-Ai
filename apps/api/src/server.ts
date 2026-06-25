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
import { logger } from '@reno/logger'
import { prisma } from '@reno/database'
import { registerRoutes } from './rest/routes/index.js'
import { errorHandler } from './rest/middleware/error-handler.js'
import { disconnectCache } from './cache/index.js'
import { startJobProcessor, stopJobProcessor } from './jobs/processor.js'

const PORT = parseInt(process.env['PORT'] ?? '4000', 10)
const HOST = process.env['HOST'] ?? '0.0.0.0'

// ─── Performance: in-process metrics ─────────────────────────────────────────

interface RequestMetrics {
  count: number
  errors: number
  totalMs: number
  p95Buffer: number[]
}

const metrics = new Map<string, RequestMetrics>()
const startTime = Date.now()

function recordMetric(route: string, durationMs: number, isError: boolean) {
  let m = metrics.get(route)
  if (!m) {
    m = { count: 0, errors: 0, totalMs: 0, p95Buffer: [] }
    metrics.set(route, m)
  }
  m.count++
  m.totalMs += durationMs
  if (isError) m.errors++
  // Keep last 1000 durations for percentile computation
  m.p95Buffer.push(durationMs)
  if (m.p95Buffer.length > 1000) m.p95Buffer.shift()
}

function computeP95(buffer: number[]): number {
  if (buffer.length === 0) return 0
  const sorted = [...buffer].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0
}

async function bootstrap() {
  // ─── Fastify Instance ───────────────────────────────────────────────────────
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
    // Performance: enable body limit and trust proxy for correct IP detection
    bodyLimit: 5 * 1024 * 1024, // 5 MB
    trustProxy: true,
  })

  // ─── Response Compression ───────────────────────────────────────────────────
  await app.register(compress, {
    global: true,
    threshold: 1024, // Only compress responses > 1KB
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

  // ─── Performance Instrumentation ────────────────────────────────────────────
  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions?.url ?? request.url.split('?')[0] ?? 'unknown'
    const ms = Math.round(reply.elapsedTime)
    const isError = reply.statusCode >= 500
    recordMetric(route, ms, isError)
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
    uptime: Math.round((Date.now() - startTime) / 1000),
  }))

  app.get('/health/db', async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  })

  // ─── Performance Metrics (Prometheus-compatible) ────────────────────────────
  app.get('/metrics', async (_request, reply) => {
    const lines: string[] = [
      '# HELP reno_api_uptime_seconds API uptime in seconds',
      '# TYPE reno_api_uptime_seconds gauge',
      `reno_api_uptime_seconds ${Math.round((Date.now() - startTime) / 1000)}`,
      '',
      '# HELP reno_http_requests_total Total HTTP requests',
      '# TYPE reno_http_requests_total counter',
      '',
      '# HELP reno_http_request_duration_ms HTTP request duration histogram (p95)',
      '# TYPE reno_http_request_duration_ms gauge',
      '',
      '# HELP reno_http_error_rate HTTP error rate per route',
      '# TYPE reno_http_error_rate gauge',
    ]

    for (const [route, m] of metrics) {
      const label = `route="${route}"`
      const avg = m.count > 0 ? Math.round(m.totalMs / m.count) : 0
      const p95 = computeP95(m.p95Buffer)
      const errRate = m.count > 0 ? (m.errors / m.count).toFixed(4) : '0'

      lines.push(
        `reno_http_requests_total{${label}} ${m.count}`,
        `reno_http_request_duration_ms{${label},quantile="avg"} ${avg}`,
        `reno_http_request_duration_ms{${label},quantile="0.95"} ${p95}`,
        `reno_http_error_rate{${label}} ${errRate}`,
      )
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4')
    return lines.join('\n')
  })

  // ─── Metrics as JSON ────────────────────────────────────────────────────────
  app.get('/metrics/json', async () => {
    const result: Record<string, unknown> = {
      uptime: Math.round((Date.now() - startTime) / 1000),
      startedAt: new Date(startTime).toISOString(),
      routes: {} as Record<string, unknown>,
    }

    for (const [route, m] of metrics) {
      ;(result['routes'] as Record<string, unknown>)[route] = {
        requests: m.count,
        errors: m.errors,
        errorRate: m.count > 0 ? +(m.errors / m.count).toFixed(4) : 0,
        avgMs: m.count > 0 ? Math.round(m.totalMs / m.count) : 0,
        p95Ms: computeP95(m.p95Buffer),
      }
    }

    return result
  })

  // ─── Background Jobs ────────────────────────────────────────────────────────
  startJobProcessor()

  // ─── Start ───────────────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: HOST })

  logger.info(`
  ╔═══════════════════════════════════════╗
  ║        Reno System API v0.1.0         ║
  ╠═══════════════════════════════════════╣
  ║  REST:      http://localhost:${PORT}/v1   ║
  ║  Health:    http://localhost:${PORT}/health  ║
  ║  Metrics:   http://localhost:${PORT}/metrics ║
  ║  Env:       ${(process.env['NODE_ENV'] ?? 'development').padEnd(10)}              ║
  ╚═══════════════════════════════════════╝
  `)
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`)
  stopJobProcessor()
  await Promise.all([
    prisma.$disconnect(),
    disconnectCache(),
  ])
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start API server')
  process.exit(1)
})
