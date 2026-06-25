import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, closeTestApp, loginAs, authHeader } from '../setup.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string

beforeAll(async () => {
  app = await buildTestApp()
  const result = await loginAs(app, 'admin@demo.com', 'Demo@123456', 'demo')
  adminToken = result.token ?? ''
})

afterAll(async () => { await closeTestApp() })

// ─── GET /v1/roles ────────────────────────────────────────────────────────────

describe('GET /v1/roles', () => {
  it('returns list of roles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/roles',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/roles' })
    expect(res.statusCode).toBe(401)
  })

  it('roles have expected fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/roles',
      headers: authHeader(adminToken),
    })
    const body = JSON.parse(res.body)
    if (body.data.length > 0) {
      const role = body.data[0]
      expect(role.id).toBeTruthy()
      expect(role.slug).toBeTruthy()
      expect(role.name).toBeTruthy()
    }
  })
})

// ─── GET /v1/org/departments ──────────────────────────────────────────────────

describe('GET /v1/org/departments', () => {
  it('returns department list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/org/departments',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/org/departments' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /v1/audit-logs ───────────────────────────────────────────────────────

describe('GET /v1/audit-logs', () => {
  it('returns paginated audit log', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/audit-logs?limit=5',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/audit-logs' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── GET /v1/settings ────────────────────────────────────────────────────────

describe('GET /v1/settings', () => {
  it('returns tenant settings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/settings',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── Tenant Isolation ─────────────────────────────────────────────────────────

describe('Tenant isolation', () => {
  it('users from one tenant cannot see another tenant\'s data', async () => {
    // The demo tenant user tries to access admin API with valid token
    // but everything returned must belong to demo tenant
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users',
      headers: authHeader(adminToken),
    })
    const body = JSON.parse(res.body)
    // All returned users should have same tenantId
    if (body.data.length > 1) {
      const tenantIds = body.data.map((u: { tenantId: string }) => u.tenantId)
      const unique = new Set(tenantIds)
      expect(unique.size).toBe(1) // Only one tenant's data returned
    }
  })
})
