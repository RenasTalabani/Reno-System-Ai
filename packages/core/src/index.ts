// Shared types, constants, and utilities for Reno System

// ─── Request Context ──────────────────────────────────────────────────────────
export interface RenoContext {
  tenantId: string
  userId: string
  sessionId: string
  roles: string[]
  companyIds: string[]
  ipAddress?: string
  userAgent?: string
  requestId: string
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true
  data: T
  meta: ApiMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
  meta: ApiMeta
}

export interface ApiMeta {
  timestamp: string
  version: string
  requestId: string
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  perPage?: number
  limit?: number
  totalPages: number
  nextCursor?: string | null
  prevCursor?: string | null
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Error Codes ──────────────────────────────────────────────────────────────
export const ErrorCode = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_TENANT_SUSPENDED: 'AUTH_TENANT_SUSPENDED',
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  // Permission
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_SCOPE_INSUFFICIENT: 'PERMISSION_SCOPE_INSUFFICIENT',
  // Resource
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_SOFT_DELETED: 'RESOURCE_SOFT_DELETED',
  // Aliases used by route handlers
  NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'RESOURCE_ALREADY_EXISTS',
  FORBIDDEN: 'PERMISSION_DENIED',
  BAD_REQUEST: 'VALIDATION_ERROR',
  // Business rules
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  // System
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MODULE_NOT_ENABLED: 'MODULE_NOT_ENABLED',
  TENANT_PLAN_LIMIT_REACHED: 'TENANT_PLAN_LIMIT_REACHED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// ─── Domain Error ─────────────────────────────────────────────────────────────
export class RenoError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message)
    this.name = 'RenoError'
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationInput {
  cursor?: string
  limit?: number
  page?: number
  perPage?: number
}

// ─── Tenant Plans ─────────────────────────────────────────────────────────────
export const TenantPlan = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const

export const TenantStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const

// ─── User Status ──────────────────────────────────────────────────────────────
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const

// ─── Permission Scopes ────────────────────────────────────────────────────────
export const PermissionScope = {
  OWN: 'own',
  TEAM: 'team',
  DEPARTMENT: 'department',
  BRANCH: 'branch',
  COMPANY: 'company',
  TENANT: 'tenant',
  ALL: 'all',
} as const

// ─── Audit Actions ────────────────────────────────────────────────────────────
export const AuditAction = {
  // Auth
  USER_LOGIN: 'auth.user.login',
  USER_LOGIN_FAILED: 'auth.user.login_failed',
  USER_LOGOUT: 'auth.user.logout',
  USER_MFA_ENABLED: 'auth.user.mfa_enabled',
  USER_MFA_DISABLED: 'auth.user.mfa_disabled',
  SESSION_REVOKED: 'auth.session.revoked',
  PASSWORD_CHANGED: 'auth.password.changed',
  // Admin
  ROLE_ASSIGNED: 'admin.role.assigned',
  ROLE_REVOKED: 'admin.role.revoked',
  PERMISSION_OVERRIDE_ADDED: 'admin.permission.override_added',
  SETTINGS_CHANGED: 'admin.settings.changed',
  BRANDING_CHANGED: 'admin.branding.changed',
  USER_CREATED: 'admin.user.created',
  USER_SUSPENDED: 'admin.user.suspended',
  USER_TERMINATED: 'admin.user.terminated',
  API_KEY_CREATED: 'security.api_key.created',
  API_KEY_REVOKED: 'security.api_key.revoked',
} as const

// ─── Utilities ────────────────────────────────────────────────────────────────
export function buildSuccessResponse<T>(data: T, meta?: Partial<ApiMeta>): ApiSuccess<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: meta?.requestId ?? crypto.randomUUID(),
      ...meta,
    },
  }
}

export function buildErrorResponse(
  code: ErrorCodeType,
  message: string,
  requestId?: string,
  details?: Array<{ field: string; message: string }>,
): ApiError {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      requestId: requestId ?? crypto.randomUUID(),
    },
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) delete result[key]
  return result as Omit<T, K>
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) result[key] = obj[key]
  return result
}
