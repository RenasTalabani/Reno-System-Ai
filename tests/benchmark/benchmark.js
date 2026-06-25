/**
 * Reno System — Performance Benchmark
 * Phase 23 — Performance & Scalability
 *
 * Measures p50, p95, p99 response times for key API endpoints.
 * Run: node tests/benchmark/benchmark.js [label]
 *   label: "baseline" | "optimized"
 */

import http from 'node:http'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000'
const LABEL = process.argv[2] ?? 'baseline'
const CONCURRENCY = 20
const ITERATIONS_PER_ENDPOINT = 60

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const payload = body ? JSON.stringify(body) : undefined
    const options = {
      hostname: url.hostname,
      port: parseInt(url.port || '80', 10),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...headers,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }
    const start = Date.now()
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        const duration = Date.now() - start
        resolve({
          status: res.statusCode,
          duration,
          size: Buffer.byteLength(data),
          encoding: res.headers['content-encoding'] ?? 'none',
        })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── Percentile Helper ────────────────────────────────────────────────────────

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function stats(durations) {
  const sorted = [...durations].sort((a, b) => a - b)
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  }
}

// ─── Concurrent Runner ────────────────────────────────────────────────────────

async function runConcurrent(fn, concurrency, iterations) {
  const durations = []
  const errors = []
  let completed = 0

  const worker = async () => {
    while (completed < iterations) {
      completed++
      try {
        const result = await fn()
        durations.push(result.duration)
        if (result.status >= 400) {
          errors.push({ status: result.status })
        }
      } catch (e) {
        errors.push({ error: e.message })
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return { durations, errors }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📊 Reno Performance Benchmark — ${LABEL.toUpperCase()}`)
  console.log(`   Base URL: ${BASE_URL}`)
  console.log(`   Concurrency: ${CONCURRENCY} | Iterations: ${ITERATIONS_PER_ENDPOINT}`)
  console.log('─'.repeat(65))

  const results = {}

  // ── 1. Health Check ────────────────────────────────────────────────────────
  process.stdout.write('  Health check ...')
  const { durations: health } = await runConcurrent(
    () => request('GET', '/health'),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /health'] = stats(health)
  console.log(` p95=${results['GET /health'].p95}ms`)

  // ── 2. Login ───────────────────────────────────────────────────────────────
  process.stdout.write('  Login (POST /v1/auth/login) ...')
  const { durations: login, errors: loginErrors } = await runConcurrent(
    () => request('POST', '/v1/auth/login', {
      email: 'admin@demo.com',
      password: 'Demo@123456',
      tenantSlug: 'demo',
    }),
    10, // Lower concurrency for login — it writes to DB
    30,
  )
  results['POST /v1/auth/login'] = { ...stats(login), errors: loginErrors.length }
  console.log(` p95=${results['POST /v1/auth/login'].p95}ms (${loginErrors.length} errors)`)

  // ── 3. Get a token for authenticated requests ──────────────────────────────
  const tokenRes = await request('POST', '/v1/auth/login', {
    email: 'admin@demo.com',
    password: 'Demo@123456',
    tenantSlug: 'demo',
  })
  let token = ''
  try {
    const body = JSON.parse(
      await new Promise((resolve) => {
        http.get(BASE_URL + '/health', (res) => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d))
        })
      })
    )
  } catch {}

  // Direct login for token
  const loginForToken = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({ email: 'admin@demo.com', password: 'Demo@123456', tenantSlug: 'demo' })
    const req = http.request({
      hostname: 'localhost', port: 4000,
      path: '/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)))
    })
    req.on('error', reject)
    req.write(payload); req.end()
  })
  token = loginForToken.data?.accessToken ?? ''

  const authHeaders = { Authorization: `Bearer ${token}` }

  // ── 4. /me ─────────────────────────────────────────────────────────────────
  process.stdout.write('  Auth /me (GET /v1/auth/me) ...')
  const { durations: me } = await runConcurrent(
    () => request('GET', '/v1/auth/me', null, authHeaders),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /v1/auth/me'] = stats(me)
  console.log(` p95=${results['GET /v1/auth/me'].p95}ms`)

  // ── 5. Users List ──────────────────────────────────────────────────────────
  process.stdout.write('  Users list (GET /v1/users) ...')
  const { durations: users } = await runConcurrent(
    () => request('GET', '/v1/users?limit=20', null, authHeaders),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /v1/users'] = stats(users)
  console.log(` p95=${results['GET /v1/users'].p95}ms`)

  // ── 6. HR Employees ────────────────────────────────────────────────────────
  process.stdout.write('  HR employees (GET /v1/hr/employees) ...')
  const { durations: hr } = await runConcurrent(
    () => request('GET', '/v1/hr/employees?limit=20', null, authHeaders),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /v1/hr/employees'] = stats(hr)
  console.log(` p95=${results['GET /v1/hr/employees'].p95}ms`)

  // ── 7. CRM Contacts ────────────────────────────────────────────────────────
  process.stdout.write('  CRM contacts (GET /v1/crm/contacts) ...')
  const { durations: crm } = await runConcurrent(
    () => request('GET', '/v1/crm/contacts?limit=20', null, authHeaders),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /v1/crm/contacts'] = stats(crm)
  console.log(` p95=${results['GET /v1/crm/contacts'].p95}ms`)

  // ── 8. Security Dashboard ──────────────────────────────────────────────────
  process.stdout.write('  Security dashboard (GET /v1/security/dashboard) ...')
  const { durations: secDash } = await runConcurrent(
    () => request('GET', '/v1/security/dashboard', null, authHeaders),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /v1/security/dashboard'] = stats(secDash)
  console.log(` p95=${results['GET /v1/security/dashboard'].p95}ms`)

  // ── 9. Audit Logs ──────────────────────────────────────────────────────────
  process.stdout.write('  Audit logs (GET /v1/audit-logs) ...')
  const { durations: audit } = await runConcurrent(
    () => request('GET', '/v1/audit-logs?limit=20', null, authHeaders),
    CONCURRENCY,
    ITERATIONS_PER_ENDPOINT,
  )
  results['GET /v1/audit-logs'] = stats(audit)
  console.log(` p95=${results['GET /v1/audit-logs'].p95}ms`)

  // ─── Summary Table ────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65))
  console.log(`  ${'Endpoint'.padEnd(38)} ${'p50'.padStart(6)} ${'p95'.padStart(6)} ${'p99'.padStart(6)}`)
  console.log('─'.repeat(65))
  for (const [name, s] of Object.entries(results)) {
    const p95Status = s.p95 < 100 ? '✓' : s.p95 < 300 ? '~' : '✗'
    console.log(`  ${name.padEnd(38)} ${String(s.p50).padStart(5)}ms ${String(s.p95).padStart(5)}ms ${String(s.p99).padStart(5)}ms ${p95Status}`)
  }
  console.log('─'.repeat(65))

  const report = {
    label: LABEL,
    timestamp: new Date().toISOString(),
    config: { baseUrl: BASE_URL, concurrency: CONCURRENCY, iterationsPerEndpoint: ITERATIONS_PER_ENDPOINT },
    results,
  }

  const outPath = `tests/load/results/benchmark-${LABEL}.json`
  const { writeFileSync } = await import('node:fs')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(`\n  📄 Report saved: ${outPath}\n`)

  return report
}

main().catch((err) => { console.error('Benchmark failed:', err); process.exit(1) })
