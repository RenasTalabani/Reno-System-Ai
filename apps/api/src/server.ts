import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import { ApolloServer } from '@apollo/server'
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify'
import { logger } from '@reno/logger'
import { prisma } from '@reno/database'
import { buildSchema } from './graphql/schema.js'
import { createContext } from './graphql/context.js'
import { registerRoutes } from './rest/routes/index.js'
import { errorHandler } from './rest/middleware/error-handler.js'

const PORT = parseInt(process.env['PORT'] ?? '4000', 10)
const HOST = process.env['HOST'] ?? '0.0.0.0'

async function bootstrap() {
  // ─── Fastify Instance ───────────────────────────────────────────────────────
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  })

  // ─── Security ───────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // CSP managed at edge/nginx
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
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    }),
  })

  await app.register(cookie)

  // ─── Error Handler ──────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler as Parameters<typeof app.setErrorHandler>[0])

  // ─── GraphQL (Apollo Server) ─────────────────────────────────────────────────
  const schema = await buildSchema()

  const apolloServer = new ApolloServer({
    schema,
    plugins: [fastifyApolloDrainPlugin(app)],
    introspection: process.env['NODE_ENV'] !== 'production',
    formatError: (formattedError) => {
      logger.error({ err: formattedError }, 'GraphQL error')
      return formattedError
    },
  })

  await apolloServer.start()

  await app.register(fastifyApollo(apolloServer), {
    path: '/graphql',
    context: createContext,
  } as any)

  // ─── REST Routes ────────────────────────────────────────────────────────────
  await registerRoutes(app)

  // ─── Health Check ───────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'reno-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
  }))

  app.get('/health/db', async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  })

  // ─── Start ───────────────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: HOST })

  logger.info(`
  ╔═══════════════════════════════════════╗
  ║        Reno System API v0.1.0         ║
  ╠═══════════════════════════════════════╣
  ║  REST:      http://localhost:${PORT}/v1   ║
  ║  GraphQL:   http://localhost:${PORT}/graphql ║
  ║  Health:    http://localhost:${PORT}/health  ║
  ║  Env:       ${(process.env['NODE_ENV'] ?? 'development').padEnd(10)}              ║
  ╚═══════════════════════════════════════╝
  `)
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start API server')
  process.exit(1)
})
