import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { mktPluginRoutes } from './plugins.routes.js'
import { mktThemeRoutes } from './themes.routes.js'
import { mktWorkflowTemplateRoutes } from './workflow-templates.routes.js'
import { mktAiAgentRoutes } from './ai-agents.routes.js'
import { mktIndustryPackRoutes } from './industry-packs.routes.js'
import { mktDeveloperRoutes } from './developer.routes.js'
import { mktInstalledRoutes } from './installed.routes.js'
import { mktSearchRoutes } from './search.routes.js'

export async function marketplaceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  await app.register(mktSearchRoutes, { prefix: '/search' })
  await app.register(mktPluginRoutes, { prefix: '/plugins' })
  await app.register(mktThemeRoutes, { prefix: '/themes' })
  await app.register(mktWorkflowTemplateRoutes, { prefix: '/workflow-templates' })
  await app.register(mktAiAgentRoutes, { prefix: '/ai-agents' })
  await app.register(mktIndustryPackRoutes, { prefix: '/industry-packs' })
  await app.register(mktDeveloperRoutes, { prefix: '/developer' })
  await app.register(mktInstalledRoutes, { prefix: '/installed' })
}
