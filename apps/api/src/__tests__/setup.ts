// ─── API Test Setup ───────────────────────────────────────────────────────────
// Builds a Fastify test app without starting a real HTTP server.
// Uses inject() for zero-port, in-process HTTP testing.

import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { registerRoutes } from '../rest/routes/index.js'
import { errorHandler } from '../rest/middleware/error-handler.js'

let _app: FastifyInstance | null = null

export async function buildTestApp(): Promise<FastifyInstance> {
  if (_app) return _app

  const app = Fastify({ logger: false, genReqId: () => crypto.randomUUID() })

  await app.register(cors, { origin: true, credentials: true })
  await app.register(cookie)

  app.setErrorHandler(errorHandler as Parameters<typeof app.setErrorHandler>[0])

  await registerRoutes(app)

  app.get('/health', async () => ({
    status: 'ok',
    service: 'reno-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: 'test',
  }))

  await app.ready()
  _app = app
  return app
}

export async function closeTestApp(): Promise<void> {
  if (_app) {
    await _app.close()
    _app = null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function loginAs(app: FastifyInstance, email: string, password: string, tenantSlug: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email, password, tenantSlug },
  })
  const body = JSON.parse(res.body)
  return {
    statusCode: res.statusCode,
    body,
    token: body?.data?.accessToken as string | undefined,
  }
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
