import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { crmDashboardRoutes } from './dashboard.routes.js'
import { crmContactRoutes } from './contacts.routes.js'
import { crmCompanyRoutes } from './companies.routes.js'
import { crmOpportunityRoutes } from './opportunities.routes.js'
import { crmPipelineRoutes } from './pipelines.routes.js'
import { crmActivityRoutes } from './activities.routes.js'
import { crmNoteRoutes } from './notes.routes.js'
import { crmContractRoutes } from './contracts.routes.js'
import { crmTagRoutes } from './tags.routes.js'

export async function crmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  await app.register(crmDashboardRoutes, { prefix: '/dashboard' })
  await app.register(crmContactRoutes, { prefix: '/contacts' })
  await app.register(crmCompanyRoutes, { prefix: '/companies' })
  await app.register(crmOpportunityRoutes, { prefix: '/opportunities' })
  await app.register(crmPipelineRoutes, { prefix: '/pipelines' })
  await app.register(crmActivityRoutes, { prefix: '/activities' })
  await app.register(crmNoteRoutes, { prefix: '/notes' })
  await app.register(crmContractRoutes, { prefix: '/contracts' })
  await app.register(crmTagRoutes, { prefix: '/tags' })
}
