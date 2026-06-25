/**
 * Redis Cache Service — Phase 23 Performance & Scalability
 *
 * Wraps ioredis with typed get/set/del helpers and TTL-aware caching
 * for hot read paths: tenant lookups, user auth, security policies, settings.
 */

import Redis from 'ioredis'
import { logger } from '@reno/logger'
import { cacheHitsTotal, cacheMissesTotal, cacheErrorsTotal } from '../observability/metrics.js'

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'

let client: Redis | null = null

function getClient(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 2000,
    })

    client.on('error', (err) => {
      logger.warn({ err }, 'Redis error — cache degraded, falling back to DB')
    })

    client.on('connect', () => {
      logger.info('Redis connected')
    })
  }
  return client
}

// ─── TTL Constants (seconds) ──────────────────────────────────────────────────

export const TTL = {
  TENANT: 300,           // 5 min — tenant config rarely changes
  USER_AUTH: 60,         // 1 min — short: permissions/status can change
  SECURITY_POLICY: 300,  // 5 min — policy changes are admin actions
  SETTINGS: 600,         // 10 min — settings are infrequently changed
  ROLES: 120,            // 2 min
  PERMISSIONS: 120,      // 2 min
} as const

// ─── Key Builders ─────────────────────────────────────────────────────────────

export const CacheKey = {
  tenant: (slug: string) => `reno:tenant:slug:${slug}`,
  tenantById: (id: string) => `reno:tenant:id:${id}`,
  user: (tenantId: string, userId: string) => `reno:user:${tenantId}:${userId}`,
  securityPolicy: (tenantId: string) => `reno:secpolicy:${tenantId}`,
  settings: (tenantId: string) => `reno:settings:${tenantId}`,
  userRoles: (tenantId: string, userId: string) => `reno:roles:${tenantId}:${userId}`,
}

// ─── Core Helpers ─────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const prefix = key.split(':')[1] ?? 'unknown'
  try {
    const val = await getClient().get(key)
    if (!val) {
      cacheMissesTotal.inc({ key_prefix: prefix })
      return null
    }
    cacheHitsTotal.inc({ key_prefix: prefix })
    return JSON.parse(val) as T
  } catch {
    cacheErrorsTotal.inc()
    return null // fall back to DB
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getClient().setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // Non-fatal: cache write failure is acceptable
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await getClient().del(...keys)
  } catch {
    // Non-fatal
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const redis = getClient()
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    // Non-fatal
  }
}

// ─── Typed Cache-Through Helpers ──────────────────────────────────────────────

export async function withCache<T>(
  key: string,
  ttl: number,
  fetch: () => Promise<T | null>,
): Promise<T | null> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const value = await fetch()
  if (value !== null) {
    await cacheSet(key, value, ttl)
  }
  return value
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

export async function disconnectCache(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}
