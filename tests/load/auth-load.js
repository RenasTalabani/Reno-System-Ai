/**
 * Phase 21 — Load Test: Authentication Endpoints
 * Tool: k6 (https://k6.io)
 * Run: k6 run tests/load/auth-load.js
 *
 * Simulates 50 concurrent users logging in over 3 minutes.
 * Target: p95 < 500ms, error rate < 1%
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ─── Custom Metrics ───────────────────────────────────────────────────────────

const loginErrors = new Rate('login_errors')
const loginDuration = new Trend('login_duration', true)
const meErrors = new Rate('me_errors')

// ─── Options ─────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m',  target: 50 },  // Ramp up to 50 users
    { duration: '1m',  target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],   // < 1% error rate
    login_errors: ['rate<0.01'],
    me_errors: ['rate<0.01'],
  },
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000'
const HEADERS = { 'Content-Type': 'application/json' }

// ─── Test Scenario ────────────────────────────────────────────────────────────

export default function () {
  group('Authentication Flow', () => {

    // Step 1: Login
    const loginStart = Date.now()
    const loginRes = http.post(
      `${BASE_URL}/v1/auth/login`,
      JSON.stringify({
        email: 'admin@demo.com',
        password: 'Demo@123456',
        tenantSlug: 'demo',
      }),
      { headers: HEADERS },
    )
    loginDuration.add(Date.now() - loginStart)

    const loginOk = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns accessToken': (r) => {
        try { return JSON.parse(r.body).data?.accessToken != null } catch { return false }
      },
    })
    loginErrors.add(!loginOk)

    if (!loginOk) {
      sleep(1)
      return
    }

    const token = JSON.parse(loginRes.body).data.accessToken

    sleep(0.5)

    // Step 2: Get current user
    const meRes = http.get(`${BASE_URL}/v1/auth/me`, {
      headers: { ...HEADERS, Authorization: `Bearer ${token}` },
    })

    const meOk = check(meRes, {
      '/me status is 200': (r) => r.status === 200,
      '/me returns user data': (r) => {
        try { return JSON.parse(r.body).data?.email != null } catch { return false }
      },
    })
    meErrors.add(!meOk)

    sleep(0.5)

    // Step 3: Get sessions
    const sessionsRes = http.get(`${BASE_URL}/v1/auth/sessions`, {
      headers: { ...HEADERS, Authorization: `Bearer ${token}` },
    })

    check(sessionsRes, {
      'sessions status is 200': (r) => r.status === 200,
    })

    sleep(1)
  })
}

export function handleSummary(data) {
  return {
    'tests/load/results/auth-load-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

function textSummary(data, options) {
  const { metrics } = data
  const p95 = metrics['http_req_duration']?.values?.['p(95)'] ?? 0
  const p99 = metrics['http_req_duration']?.values?.['p(99)'] ?? 0
  const errRate = metrics['http_req_failed']?.values?.rate ?? 0

  return `
Auth Load Test Results
======================
  p95 Response Time:  ${p95.toFixed(2)}ms
  p99 Response Time:  ${p99.toFixed(2)}ms
  Error Rate:         ${(errRate * 100).toFixed(2)}%
  Total Requests:     ${metrics['http_reqs']?.values?.count ?? 0}
`
}
