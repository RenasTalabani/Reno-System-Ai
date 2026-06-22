import { EventEmitter } from 'node:events'

// =============================================================================
// Reno Event Bus — Phase 0: In-process EventEmitter
// Phase 5+: Upgrade to Redis Pub/Sub (drop-in replacement)
// Phase 9+: Upgrade to Apache Kafka (drop-in replacement)
// =============================================================================

export interface RenoEvent<T = unknown> {
  id: string
  type: string
  version: string
  tenantId: string
  occurredAt: string
  actorId: string | null
  payload: T
  metadata: {
    sourceModule: string
    correlationId: string
  }
}

type EventHandler<T = unknown> = (event: RenoEvent<T>) => void | Promise<void>

class RenoEventBus extends EventEmitter {
  private readonly handlers = new Map<string, Set<EventHandler>>()

  publish<T>(event: Omit<RenoEvent<T>, 'id' | 'occurredAt'>): void {
    const fullEvent: RenoEvent<T> = {
      ...event,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    }

    this.emit(event.type, fullEvent)
    this.emit('*', fullEvent) // wildcard listener
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler as EventHandler)
    this.on(eventType, handler as EventHandler)

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler as EventHandler)
      this.handlers.get(eventType)?.delete(handler as EventHandler)
    }
  }

  subscribeAll(handler: EventHandler): () => void {
    return this.subscribe('*', handler)
  }
}

// Singleton event bus — shared across all modules
export const eventBus = new RenoEventBus()
eventBus.setMaxListeners(100)

// ─── Event Type Constants ─────────────────────────────────────────────────────
export const EventTypes = {
  // Auth events
  AUTH_USER_LOGIN: 'auth.user.login',
  AUTH_USER_LOGIN_FAILED: 'auth.user.login_failed',
  AUTH_USER_LOGOUT: 'auth.user.logout',
  AUTH_SESSION_REVOKED: 'auth.session.revoked',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  AUTH_MFA_ENABLED: 'auth.user.mfa_enabled',
  // User events
  USER_CREATED: 'core.user.created',
  USER_UPDATED: 'core.user.updated',
  USER_SUSPENDED: 'core.user.suspended',
  USER_ROLE_ASSIGNED: 'core.user.role_assigned',
  USER_ROLE_REVOKED: 'core.user.role_revoked',
  // Org events
  COMPANY_CREATED: 'core.company.created',
  BRANCH_CREATED: 'core.branch.created',
  DEPARTMENT_CREATED: 'core.department.created',
  TEAM_CREATED: 'core.team.created',
  // Settings events
  SETTINGS_UPDATED: 'core.settings.updated',
  BRANDING_UPDATED: 'core.branding.updated',
} as const

export default eventBus
