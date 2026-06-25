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

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getList(url: string) {
  return app.inject({
    method: 'GET',
    url,
    headers: authHeader(adminToken),
  })
}

// ─── HR Module ───────────────────────────────────────────────────────────────

describe('HR Module', () => {
  it('GET /v1/hr/employees returns list', async () => {
    const res = await getList('/v1/hr/employees')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/hr/leave/requests returns list', async () => {
    const res = await getList('/v1/hr/leave/requests')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/hr/attendance returns list', async () => {
    const res = await getList('/v1/hr/attendance')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/hr/payroll/payslips returns list', async () => {
    const res = await getList('/v1/hr/payroll/payslips')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── CRM Module ───────────────────────────────────────────────────────────────

describe('CRM Module', () => {
  it('GET /v1/crm/contacts returns list', async () => {
    const res = await getList('/v1/crm/contacts')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/crm/companies returns list', async () => {
    const res = await getList('/v1/crm/companies')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/crm/opportunities returns list', async () => {
    const res = await getList('/v1/crm/opportunities')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── Sales Module ─────────────────────────────────────────────────────────────

describe('Sales Module', () => {
  it('GET /v1/sales/quotations returns list', async () => {
    const res = await getList('/v1/sales/quotations')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/sales/orders returns list', async () => {
    const res = await getList('/v1/sales/orders')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/sales/invoices returns list', async () => {
    const res = await getList('/v1/sales/invoices')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── Finance Module ───────────────────────────────────────────────────────────

describe('Finance Module', () => {
  it('GET /v1/finance/accounts returns list', async () => {
    const res = await getList('/v1/finance/accounts')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/finance/journal-entries returns list', async () => {
    const res = await getList('/v1/finance/journal-entries')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── Inventory Module ─────────────────────────────────────────────────────────

describe('Inventory Module', () => {
  it('GET /v1/inventory/products returns list', async () => {
    const res = await getList('/v1/inventory/products')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/inventory/warehouses returns list', async () => {
    const res = await getList('/v1/inventory/warehouses')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── Projects Module ──────────────────────────────────────────────────────────

describe('Projects Module', () => {
  it('GET /v1/pm/projects returns list', async () => {
    const res = await getList('/v1/pm/projects')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── Helpdesk Module ─────────────────────────────────────────────────────────

describe('Helpdesk Module', () => {
  it('GET /v1/helpdesk/tickets returns list', async () => {
    const res = await getList('/v1/helpdesk/tickets')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('GET /v1/helpdesk/categories returns list', async () => {
    const res = await getList('/v1/helpdesk/categories')
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})

// ─── All modules require auth ─────────────────────────────────────────────────

describe('All modules require authentication', () => {
  const protectedRoutes = [
    '/v1/hr/employees',
    '/v1/crm/contacts',
    '/v1/sales/orders',
    '/v1/finance/accounts',
    '/v1/inventory/products',
    '/v1/pm/projects',
    '/v1/helpdesk/tickets',
    '/v1/analytics/dashboards',
    '/v1/automation/workflows',
  ]

  for (const route of protectedRoutes) {
    it(`GET ${route} requires auth`, async () => {
      const res = await app.inject({ method: 'GET', url: route })
      expect(res.statusCode).toBe(401)
    })
  }
})
