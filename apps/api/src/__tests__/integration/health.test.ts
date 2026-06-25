import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, closeTestApp } from '../setup.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => { app = await buildTestApp() })
afterAll(async () => { await closeTestApp() })

describe('GET /health', () => {
  it('returns 200 with ok status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('reno-api')
    expect(body.version).toBeTruthy()
    expect(body.timestamp).toBeTruthy()
  })

  it('includes environment field', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    const body = JSON.parse(res.body)
    expect(body.environment).toBeTruthy()
  })
})

describe('Unknown route', () => {
  it('returns 404 for unknown GET route', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/does-not-exist' })
    expect(res.statusCode).toBe(404)
  })

  it('returns 404 for unknown POST route', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/not-a-route', payload: {} })
    expect(res.statusCode).toBe(404)
  })
})
