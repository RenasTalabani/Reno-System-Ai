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
import { hrRoutes } from './hr/index.js'
import { pmRoutes } from './pm/index.js'
import { crmRoutes } from './crm/index.js'
import { salesRoutes } from './sales/index.js'
import { financeRoutes } from './finance/index.js'
import { inventoryRoutes } from './inventory/index.js'
import { procurementRoutes } from './procurement/index.js'
import { manufacturingRoutes } from './manufacturing/index.js'
import { analyticsRoutes } from './analytics/index.js'
import { brainRoutes } from './brain/index.js'
import { automationRoutes } from './automation/index.js'
import { docsRoutes } from './docs/index.js'
import { kbRoutes } from './kb/index.js'
import { portalRoutes } from './portal/index.js'
import { helpdeskRoutes } from './helpdesk/index.js'
import { commRoutes } from './comm/index.js'
import { marketplaceRoutes } from './marketplace/index.js'

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
      await v1.register(hrRoutes, { prefix: '/hr' })
      await v1.register(pmRoutes, { prefix: '/pm' })
      await v1.register(crmRoutes, { prefix: '/crm' })
      await v1.register(salesRoutes, { prefix: '/sales' })
      await v1.register(financeRoutes, { prefix: '/finance' })
      await v1.register(inventoryRoutes, { prefix: '/inventory' })
      await v1.register(procurementRoutes, { prefix: '/procurement' })
      await v1.register(manufacturingRoutes, { prefix: '/manufacturing' })
      await v1.register(analyticsRoutes, { prefix: '/analytics' })
      await v1.register(brainRoutes, { prefix: '/brain' })
      await v1.register(automationRoutes, { prefix: '/automation' })
      await v1.register(docsRoutes, { prefix: '/docs' })
      await v1.register(kbRoutes, { prefix: '/kb' })
      await v1.register(portalRoutes, { prefix: '/portal' })
      await v1.register(helpdeskRoutes, { prefix: '/helpdesk' })
      await v1.register(commRoutes, { prefix: '/comm' })
      await v1.register(marketplaceRoutes, { prefix: '/marketplace' })
    },
    { prefix: '/v1' },
  )
}
