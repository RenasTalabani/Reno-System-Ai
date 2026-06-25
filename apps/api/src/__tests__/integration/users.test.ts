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

// ─── GET /v1/users ────────────────────────────────────────────────────────────

describe('GET /v1/users', () => {
  it('returns paginated user list for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta.pagination).toBeDefined()
    expect(typeof body.meta.pagination.total).toBe('number')
  })

  it('returns 401 without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/users' })
    expect(res.statusCode).toBe(401)
  })

  it('supports limit query parameter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users?limit=2',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.length).toBeLessThanOrEqual(2)
  })

  it('supports search query parameter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users?search=admin',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
  })

  it('returns users with expected shape', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users?limit=1',
      headers: authHeader(adminToken),
    })
    const body = JSON.parse(res.body)
    if (body.data.length > 0) {
      const user = body.data[0]
      expect(user.id).toBeTruthy()
      expect(user.email).toBeTruthy()
      expect(user.status).toBeTruthy()
      expect(user.passwordHash).toBeUndefined() // must never be exposed
    }
  })
})

// ─── GET /v1/users/:id ───────────────────────────────────────────────────────

describe('GET /v1/users/:id', () => {
  it('returns user by id', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/users?limit=1',
      headers: authHeader(adminToken),
    })
    const list = JSON.parse(listRes.body)
    if (list.data.length === 0) return

    const userId = list.data[0].id
    const res = await app.inject({
      method: 'GET',
      url: `/v1/users/${userId}`,
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.id).toBe(userId)
  })

  it('returns 404 for non-existent user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users/00000000-0000-0000-0000-000000000000',
      headers: authHeader(adminToken),
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users/any-id',
    })
    expect(res.statusCode).toBe(401)
  })
})
