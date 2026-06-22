import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes.js'
import { userRoutes } from './users.routes.js'
import { orgRoutes } from './org.routes.js'
import { roleRoutes } from './roles.routes.js'
import { settingsRoutes } from './settings.routes.js'
import { auditRoutes } from './audit.routes.js'
import { notificationRoutes } from './notifications.routes.js'
import { translationRoutes } from './translations.routes.js'
import { aiUsageRoutes } from './ai-usage.routes.js'

export async function registerRoutes(app: FastifyInstance) {
  // All REST routes are under /v1
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' })
      await v1.register(userRoutes, { prefix: '/users' })
      await v1.register(orgRoutes, { prefix: '/org' })
      await v1.register(roleRoutes, { prefix: '/roles' })
      await v1.register(settingsRoutes, { prefix: '/settings' })
      await v1.register(auditRoutes, { prefix: '/audit-logs' })
      await v1.register(notificationRoutes, { prefix: '/notifications' })
      await v1.register(translationRoutes, { prefix: '/translations' })
      await v1.register(aiUsageRoutes, { prefix: '/ai-usage' })
    },
    { prefix: '/v1' },
  )
}
