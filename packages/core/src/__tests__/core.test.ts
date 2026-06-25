import { describe, it, expect, beforeEach } from 'vitest'
import {
  RenoError,
  ErrorCode,
  buildSuccessResponse,
  buildErrorResponse,
  omit,
  pick,
  sleep,
  TenantPlan,
  TenantStatus,
  UserStatus,
} from '../index.js'

// ─── RenoError ────────────────────────────────────────────────────────────────

describe('RenoError', () => {
  it('creates error with correct properties', () => {
    const err = new RenoError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Bad credentials', 401)
    expect(err.code).toBe('AUTH_INVALID_CREDENTIALS')
    expect(err.message).toBe('Bad credentials')
    expect(err.statusCode).toBe(401)
    expect(err.name).toBe('RenoError')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(RenoError)
  })

  it('defaults to statusCode 400', () => {
    const err = new RenoError(ErrorCode.VALIDATION_ERROR, 'Invalid input')
    expect(err.statusCode).toBe(400)
  })

  it('accepts optional details array', () => {
    const details = [{ field: 'email', message: 'Invalid email format' }]
    const err = new RenoError(ErrorCode.VALIDATION_ERROR, 'Validation failed', 400, details)
    expect(err.details).toEqual(details)
  })

  it('details is undefined when not provided', () => {
    const err = new RenoError(ErrorCode.RESOURCE_NOT_FOUND, 'Not found', 404)
    expect(err.details).toBeUndefined()
  })

  it('has all required error codes defined', () => {
    expect(ErrorCode.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS')
    expect(ErrorCode.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED')
    expect(ErrorCode.AUTH_TOKEN_INVALID).toBe('AUTH_TOKEN_INVALID')
    expect(ErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
    expect(ErrorCode.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND')
    expect(ErrorCode.RESOURCE_ALREADY_EXISTS).toBe('RESOURCE_ALREADY_EXISTS')
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCode.SERVER_ERROR).toBe('SERVER_ERROR')
  })

  it('aliases resolve to correct codes', () => {
    expect(ErrorCode.NOT_FOUND).toBe('RESOURCE_NOT_FOUND')
    expect(ErrorCode.CONFLICT).toBe('RESOURCE_ALREADY_EXISTS')
    expect(ErrorCode.FORBIDDEN).toBe('PERMISSION_DENIED')
    expect(ErrorCode.BAD_REQUEST).toBe('VALIDATION_ERROR')
  })
})

// ─── buildSuccessResponse ─────────────────────────────────────────────────────

describe('buildSuccessResponse', () => {
  it('wraps data in success envelope', () => {
    const data = { id: '123', name: 'Test' }
    const response = buildSuccessResponse(data)
    expect(response.success).toBe(true)
    expect(response.data).toEqual(data)
  })

  it('includes required meta fields', () => {
    const response = buildSuccessResponse({ value: 42 })
    expect(response.meta).toBeDefined()
    expect(response.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(response.meta.version).toBe('1.0.0')
    expect(response.meta.requestId).toBeTruthy()
  })

  it('accepts custom meta overrides', () => {
    const requestId = 'test-request-123'
    const response = buildSuccessResponse({}, { requestId })
    expect(response.meta.requestId).toBe(requestId)
  })

  it('handles null data', () => {
    const response = buildSuccessResponse(null)
    expect(response.success).toBe(true)
    expect(response.data).toBeNull()
  })

  it('handles array data', () => {
    const items = [1, 2, 3]
    const response = buildSuccessResponse(items)
    expect(response.data).toEqual(items)
  })

  it('timestamps are valid ISO strings', () => {
    const response = buildSuccessResponse({})
    const date = new Date(response.meta.timestamp)
    expect(isNaN(date.getTime())).toBe(false)
  })
})

// ─── buildErrorResponse ───────────────────────────────────────────────────────

describe('buildErrorResponse', () => {
  it('builds error envelope with code and message', () => {
    const response = buildErrorResponse(ErrorCode.AUTH_TOKEN_INVALID, 'Token is invalid')
    expect(response.success).toBe(false)
    expect(response.error.code).toBe('AUTH_TOKEN_INVALID')
    expect(response.error.message).toBe('Token is invalid')
  })

  it('includes meta with timestamp', () => {
    const response = buildErrorResponse(ErrorCode.SERVER_ERROR, 'Internal error')
    expect(response.meta.timestamp).toBeTruthy()
    expect(response.meta.version).toBe('1.0.0')
  })

  it('accepts optional requestId', () => {
    const reqId = 'req-abc-123'
    const response = buildErrorResponse(ErrorCode.RESOURCE_NOT_FOUND, 'Not found', reqId)
    expect(response.meta.requestId).toBe(reqId)
  })

  it('accepts optional details', () => {
    const details = [{ field: 'email', message: 'Required' }]
    const response = buildErrorResponse(ErrorCode.VALIDATION_ERROR, 'Failed', undefined, details)
    expect(response.error.details).toEqual(details)
  })
})

// ─── omit ─────────────────────────────────────────────────────────────────────

describe('omit', () => {
  it('removes specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = omit(obj, ['b'])
    expect(result).toEqual({ a: 1, c: 3 })
    expect('b' in result).toBe(false)
  })

  it('removes multiple keys', () => {
    const obj = { id: '1', password: 'secret', email: 'test@test.com', role: 'admin' }
    const result = omit(obj, ['password', 'role'])
    expect(result).toEqual({ id: '1', email: 'test@test.com' })
  })

  it('returns copy — does not mutate original', () => {
    const obj = { a: 1, b: 2 }
    omit(obj, ['a'])
    expect(obj).toEqual({ a: 1, b: 2 })
  })

  it('returns same object if no keys match', () => {
    const obj = { a: 1, b: 2 }
    const result = omit(obj, [] as never[])
    expect(result).toEqual({ a: 1, b: 2 })
  })
})

// ─── pick ─────────────────────────────────────────────────────────────────────

describe('pick', () => {
  it('picks specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = pick(obj, ['a', 'c'])
    expect(result).toEqual({ a: 1, c: 3 })
    expect('b' in result).toBe(false)
  })

  it('picks single key', () => {
    const obj = { id: 'abc', name: 'Test', email: 'test@test.com' }
    const result = pick(obj, ['id'])
    expect(result).toEqual({ id: 'abc' })
  })

  it('returns copy — does not mutate original', () => {
    const obj = { a: 1, b: 2 }
    pick(obj, ['a'])
    expect(obj).toEqual({ a: 1, b: 2 })
  })
})

// ─── sleep ────────────────────────────────────────────────────────────────────

describe('sleep', () => {
  it('resolves after approximately the given delay', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(40)
    expect(elapsed).toBeLessThan(200)
  })

  it('returns a Promise', () => {
    const result = sleep(0)
    expect(result).toBeInstanceOf(Promise)
    return result
  })
})

// ─── Constants ────────────────────────────────────────────────────────────────

describe('TenantPlan', () => {
  it('has all expected plans', () => {
    expect(TenantPlan.STARTER).toBe('starter')
    expect(TenantPlan.PROFESSIONAL).toBe('professional')
    expect(TenantPlan.BUSINESS).toBe('business')
    expect(TenantPlan.ENTERPRISE).toBe('enterprise')
  })
})

describe('TenantStatus', () => {
  it('has all expected statuses', () => {
    expect(TenantStatus.TRIAL).toBe('trial')
    expect(TenantStatus.ACTIVE).toBe('active')
    expect(TenantStatus.SUSPENDED).toBe('suspended')
    expect(TenantStatus.CANCELLED).toBe('cancelled')
  })
})

describe('UserStatus', () => {
  it('has all expected statuses', () => {
    expect(UserStatus.ACTIVE).toBe('active')
    expect(UserStatus.INACTIVE).toBe('inactive')
    expect(UserStatus.SUSPENDED).toBe('suspended')
    expect(UserStatus.PENDING).toBe('pending')
  })
})
