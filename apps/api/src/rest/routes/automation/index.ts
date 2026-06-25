import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { autoDashboardRoutes } from './dashboard.routes.js'
import { autoWorkflowRoutes } from './workflows.routes.js'
import { autoExecutionRoutes } from './executions.routes.js'
import { autoApprovalRoutes } from './approvals.routes.js'
import { autoTemplateRoutes } from './templates.routes.js'
import { autoWebhookRoutes } from './webhooks.routes.js'
import { autoEventRoutes } from './events.routes.js'

export async function automationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  await app.register(autoDashboardRoutes, { prefix: '/dashboard' })
  await app.register(autoWorkflowRoutes, { prefix: '/workflows' })
  await app.register(autoExecutionRoutes, { prefix: '/executions' })
  await app.register(autoApprovalRoutes, { prefix: '/approvals' })
  await app.register(autoTemplateRoutes, { prefix: '/templates' })
  await app.register(autoWebhookRoutes, { prefix: '/webhooks' })
  await app.register(autoEventRoutes, { prefix: '/events' })
}
