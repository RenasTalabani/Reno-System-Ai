import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, closeTestApp, loginAs, authHeader } from '../setup.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string

const DEMO = {
  email: 'admin@demo.com',
  password: 'Demo@123456',
  tenantSlug: 'demo',
}

beforeAll(async () => {
  app = await buildTestApp()
  const result = await loginAs(app, DEMO.email, DEMO.password, DEMO.tenantSlug)
  adminToken = result.token ?? ''
})

afterAll(async () => { await closeTestApp() })

// ─── POST /v1/auth/login ──────────────────────────────────────────────────────

describe('POST /v1/auth/login', () => {
  it('returns 200 and tokens on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: DEMO,
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
    expect(body.data.user).toBeDefined()
    expect(body.data.user.email).toBe(DEMO.email)
    expect(body.data.user.tenantId).toBeTruthy()
  })

  it('returns user with required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: DEMO,
    })
    const { data } = JSON.parse(res.body)
    expect(data.user.id).toBeTruthy()
    expect(data.user.email).toBe(DEMO.email)
    expect(data.user.roles).toBeInstanceOf(Array)
    expect(data.user.tenantId).toBeTruthy()
  })

  it('returns 401 for wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { ...DEMO, password: 'WrongPass@999' },
    })
    expect(res.statusCode).toBe(401)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('AUTH_INVALID_CREDENTIALS')
  })

  it('returns 401 for wrong email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { ...DEMO, email: 'nobody@nowhere.com' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for missing tenantSlug', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: DEMO.email, password: DEMO.password },
    })
    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
  })

  it('returns 400 for missing email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { password: DEMO.password, tenantSlug: DEMO.tenantSlug },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { ...DEMO, email: 'not-an-email' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for empty password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { ...DEMO, password: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 for non-existent tenant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { ...DEMO, tenantSlug: 'tenant-does-not-exist' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('response has correct meta structure', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: DEMO,
    })
    const body = JSON.parse(res.body)
    expect(body.meta).toBeDefined()
    expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.meta.version).toBeTruthy()
  })
})

// ─── GET /v1/auth/me ─────────────────────────────────────────────────────────

describe('GET /v1/auth/me', () => {
  it('returns current user for valid token', async () => {
    expect(adminToken).toBeTruthy()
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.email).toBe(DEMO.email)
    expect(body.data.id).toBeTruthy()
    expect(body.data.tenantId).toBeTruthy()
    expect(body.data.roles).toBeInstanceOf(Array)
    expect(body.data.status).toBe('active')
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader('invalid.token.here'),
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with malformed Bearer header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { Authorization: 'NotBearer token-here' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /v1/auth/logout ─────────────────────────────────────────────────────

describe('POST /v1/auth/logout', () => {
  it('returns 200 and loggedOut:true', async () => {
    // Login fresh to get a token we can invalidate
    const loginRes = await loginAs(app, DEMO.email, DEMO.password, DEMO.tenantSlug)
    const token = loginRes.token!

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: authHeader(token),
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.loggedOut).toBe(true)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /v1/auth/sessions ───────────────────────────────────────────────────

describe('GET /v1/auth/sessions', () => {
  it('returns list of active sessions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/sessions',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/sessions' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── POST /v1/auth/refresh ───────────────────────────────────────────────────

describe('POST /v1/auth/refresh', () => {
  it('returns new access token with valid refresh token', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: DEMO,
    })
    const { data } = JSON.parse(loginRes.body)
    const refreshToken = data.refreshToken

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.accessToken).toBeTruthy()
  })

  it('returns 401 with invalid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: 'invalid-refresh-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with no token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })
})
