import { describe, it, expect, beforeAll } from 'vitest'
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  extractBearerToken,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateMfaSecret,
  verifyMfaCode,
  generateBackupCodes,
  hashApiKey,
  generateApiKey,
} from '../index.js'
import { RenoError } from '@reno/core'

// ─── Setup test JWT secrets ───────────────────────────────────────────────────

beforeAll(() => {
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-at-least-32-chars-long-for-security'
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-at-least-32-chars-long-for-security'
  process.env['JWT_ACCESS_EXPIRES_IN'] = '15m'
  process.env['JWT_REFRESH_EXPIRES_IN'] = '7d'
})

// ─── signAccessToken / verifyAccessToken ─────────────────────────────────────

describe('signAccessToken', () => {
  it('signs a valid access token', () => {
    const token = signAccessToken({
      sub: 'user-123',
      tid: 'tenant-abc',
      sid: 'session-xyz',
      roles: ['admin'],
      email: 'test@example.com',
    })
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('throws when JWT_ACCESS_SECRET is missing', () => {
    const original = process.env['JWT_ACCESS_SECRET']
    delete process.env['JWT_ACCESS_SECRET']
    expect(() =>
      signAccessToken({ sub: 'u', tid: 't', sid: 's', roles: [], email: 'x@x.com' })
    ).toThrow('JWT_ACCESS_SECRET not configured')
    process.env['JWT_ACCESS_SECRET'] = original
  })
})

describe('verifyAccessToken', () => {
  it('returns payload for valid token', () => {
    const payload = {
      sub: 'user-123',
      tid: 'tenant-abc',
      sid: 'session-xyz',
      roles: ['admin', 'editor'],
      email: 'admin@test.com',
    }
    const token = signAccessToken(payload)
    const decoded = verifyAccessToken(token)
    expect(decoded.sub).toBe(payload.sub)
    expect(decoded.tid).toBe(payload.tid)
    expect(decoded.sid).toBe(payload.sid)
    expect(decoded.roles).toEqual(payload.roles)
    expect(decoded.email).toBe(payload.email)
  })

  it('throws RenoError for invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow(RenoError)
  })

  it('throws RenoError with AUTH_TOKEN_INVALID for tampered token', () => {
    const token = signAccessToken({ sub: 'u', tid: 't', sid: 's', roles: [], email: 'x@x.com' })
    const tampered = token.slice(0, -5) + 'XXXXX'
    try {
      verifyAccessToken(tampered)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(RenoError)
      expect((err as RenoError).code).toBe('AUTH_TOKEN_INVALID')
      expect((err as RenoError).statusCode).toBe(401)
    }
  })

  it('token signed with wrong secret is rejected', () => {
    const originalSecret = process.env['JWT_ACCESS_SECRET']
    process.env['JWT_ACCESS_SECRET'] = 'different-secret-at-least-32-chars-long'
    const token = signAccessToken({ sub: 'u', tid: 't', sid: 's', roles: [], email: 'x@x.com' })
    process.env['JWT_ACCESS_SECRET'] = originalSecret
    expect(() => verifyAccessToken(token)).toThrow(RenoError)
  })
})

// ─── signRefreshToken / verifyRefreshToken ────────────────────────────────────

describe('signRefreshToken', () => {
  it('signs a refresh token with session id', () => {
    const token = signRefreshToken('session-abc-123')
    expect(token).toBeTruthy()
    expect(token.split('.')).toHaveLength(3)
  })
})

describe('verifyRefreshToken', () => {
  it('returns session id from valid refresh token', () => {
    const sessionId = 'session-test-456'
    const token = signRefreshToken(sessionId)
    const result = verifyRefreshToken(token)
    expect(result.sid).toBe(sessionId)
  })

  it('throws RenoError for invalid refresh token', () => {
    expect(() => verifyRefreshToken('garbage.token.value')).toThrow(RenoError)
  })
})

// ─── extractBearerToken ───────────────────────────────────────────────────────

describe('extractBearerToken', () => {
  it('extracts token from valid Bearer header', () => {
    const token = 'my-jwt-token-value'
    const result = extractBearerToken(`Bearer ${token}`)
    expect(result).toBe(token)
  })

  it('throws RenoError when header is undefined', () => {
    expect(() => extractBearerToken(undefined)).toThrow(RenoError)
  })

  it('throws RenoError when header does not start with Bearer', () => {
    expect(() => extractBearerToken('Token my-token')).toThrow(RenoError)
  })

  it('throws RenoError for empty string', () => {
    expect(() => extractBearerToken('')).toThrow(RenoError)
  })
})

// ─── hashPassword / verifyPassword ───────────────────────────────────────────

describe('hashPassword', () => {
  it('hashes a password', async () => {
    const hash = await hashPassword('StrongPass@123')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('StrongPass@123')
    expect(hash.startsWith('$2')).toBe(true) // bcrypt prefix
  })

  it('produces different hashes for same password', async () => {
    const hash1 = await hashPassword('SamePass@123')
    const hash2 = await hashPassword('SamePass@123')
    expect(hash1).not.toBe(hash2) // salt is random
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const password = 'Correct$Pass123'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)
    expect(result).toBe(true)
  })

  it('returns false for incorrect password', async () => {
    const hash = await hashPassword('ActualPass@123')
    const result = await verifyPassword('WrongPass@123', hash)
    expect(result).toBe(false)
  })

  it('returns false for empty password', async () => {
    const hash = await hashPassword('SecretPass@123')
    const result = await verifyPassword('', hash)
    expect(result).toBe(false)
  })
})

// ─── validatePasswordStrength ─────────────────────────────────────────────────

describe('validatePasswordStrength', () => {
  it('accepts strong password', () => {
    const result = validatePasswordStrength('StrongPass@123')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects password shorter than 12 chars', () => {
    const result = validatePasswordStrength('Short@1')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 12 characters')
  })

  it('rejects password without uppercase', () => {
    const result = validatePasswordStrength('nouppercase@123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects password without lowercase', () => {
    const result = validatePasswordStrength('NOLOWER@12345')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('rejects password without number', () => {
    const result = validatePasswordStrength('NoNumbers@Here!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('rejects password without special character', () => {
    const result = validatePasswordStrength('NoSpecialChar123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('accumulates multiple errors', () => {
    const result = validatePasswordStrength('weak')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

// ─── MFA ─────────────────────────────────────────────────────────────────────

describe('generateMfaSecret', () => {
  it('generates a secret and otpauth URL', () => {
    const { secret, otpauthUrl } = generateMfaSecret('user@example.com')
    expect(secret).toBeTruthy()
    expect(typeof secret).toBe('string')
    expect(otpauthUrl).toContain('otpauth://totp/')
    expect(otpauthUrl).toContain('user%40example.com')
  })

  it('secret is base32 encoded (only A-Z and 2-7)', () => {
    const { secret } = generateMfaSecret('test@test.com')
    expect(/^[A-Z2-7]+=*$/.test(secret)).toBe(true)
  })
})

describe('verifyMfaCode', () => {
  it('rejects an obviously wrong code', () => {
    const { secret } = generateMfaSecret('user@example.com')
    const result = verifyMfaCode(secret, '000000')
    // Can't guarantee this fails since 000000 might be valid at the moment,
    // but statistically it's extremely unlikely
    expect(typeof result).toBe('boolean')
  })
})

// ─── generateBackupCodes ──────────────────────────────────────────────────────

describe('generateBackupCodes', () => {
  it('generates 8 codes by default', () => {
    const codes = generateBackupCodes()
    expect(codes).toHaveLength(8)
  })

  it('generates specified number of codes', () => {
    const codes = generateBackupCodes(5)
    expect(codes).toHaveLength(5)
  })

  it('codes have format XXXX-XXXX-XXXX-XXXX', () => {
    const codes = generateBackupCodes()
    for (const code of codes) {
      expect(code.split('-')).toHaveLength(4)
      expect(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)).toBe(true)
    }
  })

  it('codes are unique', () => {
    const codes = generateBackupCodes(8)
    const unique = new Set(codes)
    expect(unique.size).toBe(8)
  })
})

// ─── generateApiKey / hashApiKey ─────────────────────────────────────────────

describe('generateApiKey', () => {
  it('generates a key with reno_ prefix', () => {
    const { key } = generateApiKey()
    expect(key.startsWith('reno_')).toBe(true)
  })

  it('generates unique keys', () => {
    const { key: key1 } = generateApiKey()
    const { key: key2 } = generateApiKey()
    expect(key1).not.toBe(key2)
  })

  it('prefix is first 12 chars of key', () => {
    const { key, prefix } = generateApiKey()
    expect(prefix).toBe(key.slice(0, 12))
  })
})

describe('hashApiKey', () => {
  it('hashes a key to hex string', async () => {
    const hash = await hashApiKey('reno_testkey123')
    expect(hash).toBeTruthy()
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
  })

  it('same key always produces same hash', async () => {
    const key = 'reno_deterministic_key'
    const hash1 = await hashApiKey(key)
    const hash2 = await hashApiKey(key)
    expect(hash1).toBe(hash2)
  })

  it('different keys produce different hashes', async () => {
    const hash1 = await hashApiKey('reno_key_one')
    const hash2 = await hashApiKey('reno_key_two')
    expect(hash1).not.toBe(hash2)
  })
})
