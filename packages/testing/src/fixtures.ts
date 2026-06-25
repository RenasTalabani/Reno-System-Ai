// ─── Test Fixtures ────────────────────────────────────────────────────────────
// Pre-defined test scenarios and expected values.

export const DEMO_TENANT_SLUG = 'demo'
export const DEMO_ADMIN_EMAIL = 'admin@demo.com'
export const DEMO_ADMIN_PASSWORD = 'Demo@123456'

export const TEST_JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters-long'
export const TEST_JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long'

export const STRONG_PASSWORDS = [
  'StrongPass@123!',
  'Enterprise#2024X',
  'Complex$Pass789',
]

export const WEAK_PASSWORDS = [
  'short',
  'no-uppercase-123!',
  'NOLOWERCASE123!',
  'NoNumbers!Here!',
  'NoSpecialChar123',
]

export const VALID_EMAILS = [
  'user@example.com',
  'admin.user+tag@company.org',
  'test123@sub.domain.io',
]

export const INVALID_EMAILS = [
  'notanemail',
  '@nodomain.com',
  'no-at-sign',
  '',
]

export const API_RESPONSE_SHAPE = {
  success: true,
  data: expect.anything(),
  meta: {
    timestamp: expect.any(String),
    version: expect.any(String),
    requestId: expect.any(String),
  },
}

export const API_ERROR_SHAPE = {
  success: false,
  error: {
    code: expect.any(String),
    message: expect.any(String),
  },
}
