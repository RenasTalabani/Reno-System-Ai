/**
 * Phase 21 — Stress Test: Full API Under Extreme Load
 * Tool: k6
 * Run: k6 run tests/load/api-stress.js
 *
 * Pushes the API beyond its normal capacity to find breaking points.
 * Simulates 200 concurrent users over 5 minutes.
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '1m',  target: 100 },
    { duration: '2m',  target: 200 },   // Peak stress
    { duration: '1m',  target: 100 },   // Recovery
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // Stress test: looser threshold
    http_req_failed: ['rate<0.05'],     // Allow up to 5% error under stress
    errors: ['rate<0.1'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000'
const HEADERS = { 'Content-Type': 'application/json' }

let sharedToken = null

export function setup() {
  const res = http.post(
    `${BASE_URL}/v1/auth/login`,
    JSON.stringify({ email: 'admin@demo.com', password: 'Demo@123456', tenantSlug: 'demo' }),
    { headers: HEADERS },
  )
  if (res.status === 200) {
    return { token: JSON.parse(res.body).data.accessToken }
  }
  return { token: null }
}

export default function ({ token }) {
  if (!token) { sleep(1); return }

  const headers = { ...HEADERS, Authorization: `Bearer ${token}` }

  group('Read Operations', () => {
    const routes = [
      '/v1/auth/me',
      '/v1/users?limit=10',
      '/v1/roles',
      '/v1/org/departments',
      '/v1/hr/employees?limit=10',
      '/v1/crm/contacts?limit=10',
      '/v1/sales/orders?limit=10',
      '/v1/inventory/products?limit=10',
    ]

    const route = routes[Math.floor(Math.random() * routes.length)]
    const res = http.get(`${BASE_URL}${route}`, { headers })

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'response is valid JSON': (r) => {
        try { JSON.parse(r.body); return true } catch { return false }
      },
    })
    errorRate.add(!ok)
  })

  sleep(Math.random() * 0.5)
}

export function handleSummary(data) {
  return {
    'tests/load/results/api-stress-summary.json': JSON.stringify(data, null, 2),
  }
}
