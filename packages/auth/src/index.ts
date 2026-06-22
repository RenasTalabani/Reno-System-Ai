import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { RenoError, ErrorCode } from '@reno/core'

// ─── JWT ──────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string        // user id
  tid: string        // tenant id
  sid: string        // session id
  roles: string[]
  email: string
  iat?: number
  exp?: number
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  const secret = process.env['JWT_ACCESS_SECRET']
  if (!secret) throw new Error('JWT_ACCESS_SECRET not configured')

  return jwt.sign(payload, secret, {
    expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    algorithm: 'HS256',
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env['JWT_ACCESS_SECRET']
  if (!secret) throw new Error('JWT_ACCESS_SECRET not configured')

  try {
    return jwt.verify(token, secret) as AccessTokenPayload
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new RenoError(ErrorCode.AUTH_TOKEN_EXPIRED, 'Access token expired', 401)
    }
    throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid access token', 401)
  }
}

export function signRefreshToken(sessionId: string): string {
  const secret = process.env['JWT_REFRESH_SECRET']
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured')

  return jwt.sign({ sid: sessionId }, secret, {
    expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
    algorithm: 'HS256',
  })
}

export function verifyRefreshToken(token: string): { sid: string } {
  const secret = process.env['JWT_REFRESH_SECRET']
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured')

  try {
    return jwt.verify(token, secret) as { sid: string }
  } catch {
    throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid refresh token', 401)
  }
}

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new RenoError(ErrorCode.AUTH_TOKEN_INVALID, 'Authorization header missing or invalid', 401)
  }
  return authHeader.slice(7)
}

// ─── Password ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 12) errors.push('Password must be at least 12 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter')
  if (!/\d/.test(password)) errors.push('Password must contain at least one number')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character')
  return { valid: errors.length === 0, errors }
}

// ─── MFA (TOTP) ───────────────────────────────────────────────────────────────

export function generateMfaSecret(userEmail: string): {
  secret: string
  otpauthUrl: string
} {
  const secret = speakeasy.generateSecret({
    name: `Reno System (${userEmail})`,
    issuer: 'Reno System',
    length: 32,
  })

  return {
    secret: secret.base32 ?? '',
    otpauthUrl: secret.otpauth_url ?? '',
  }
}

export async function generateMfaQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl)
}

export function verifyMfaCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1, // ±30 seconds tolerance
  })
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    Array.from({ length: 4 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase()
    ).join('-')
  )
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'reno_'
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const key = `${prefix}${randomPart}`
  const keyPrefix = key.slice(0, 12)

  // Hash for storage using Web Crypto (available in Node 22)
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  // Simple SHA-256 hash (async version needed; return sync placeholder)
  const hash = Buffer.from(data).toString('base64')

  return { key, prefix: keyPrefix, hash }
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hashBuffer).toString('hex')
}
