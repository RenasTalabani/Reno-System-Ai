// ─── Test Data Factories ──────────────────────────────────────────────────────
// Generate realistic test data for all domain models.

let counter = 0
const next = () => ++counter

export function makeId(): string {
  return `test-${Date.now()}-${next()}`
}

export function makeEmail(prefix = 'user'): string {
  return `${prefix}-${next()}@test.reno.dev`
}

// ─── Tenant Factory ───────────────────────────────────────────────────────────

export interface TenantInput {
  slug?: string
  name?: string
  plan?: string
  status?: string
}

export function makeTenant(overrides: TenantInput = {}) {
  const n = next()
  return {
    slug: overrides.slug ?? `test-tenant-${n}`,
    name: overrides.name ?? `Test Company ${n}`,
    plan: overrides.plan ?? 'enterprise',
    status: overrides.status ?? 'active',
    displayName: `Test Co ${n}`,
    country: 'US',
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
  }
}

// ─── User Factory ─────────────────────────────────────────────────────────────

export interface UserInput {
  email?: string
  firstName?: string
  lastName?: string
  status?: string
  tenantId?: string
}

export function makeUser(overrides: UserInput = {}) {
  const n = next()
  return {
    email: overrides.email ?? makeEmail('user'),
    firstName: overrides.firstName ?? `First${n}`,
    lastName: overrides.lastName ?? `Last${n}`,
    status: overrides.status ?? 'active',
    tenantId: overrides.tenantId ?? makeId(),
    passwordHash: '$2b$12$test.hash.placeholder',
  }
}

// ─── Auth Payload Factory ─────────────────────────────────────────────────────

export function makeAccessTokenPayload(overrides: Partial<{
  sub: string
  tid: string
  sid: string
  roles: string[]
  email: string
}> = {}) {
  return {
    sub: overrides.sub ?? makeId(),
    tid: overrides.tid ?? makeId(),
    sid: overrides.sid ?? makeId(),
    roles: overrides.roles ?? ['user'],
    email: overrides.email ?? makeEmail(),
  }
}

// ─── Login Request Factory ────────────────────────────────────────────────────

export function makeLoginRequest(overrides: Partial<{
  email: string
  password: string
  tenantSlug: string
}> = {}) {
  return {
    email: overrides.email ?? 'admin@demo.com',
    password: overrides.password ?? 'Demo@123456',
    tenantSlug: overrides.tenantSlug ?? 'demo',
  }
}

// ─── HTTP Request Helper ──────────────────────────────────────────────────────

export function makeAuthHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
