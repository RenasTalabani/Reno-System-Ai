import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { aiExecExecutivesRoutes } from './executives.routes.js'
import { aiDigitalTwinRoutes } from './digital-twin.routes.js'
import { aiExecReportsRoutes } from './reports.routes.js'
import { aiExecRecommendationsRoutes } from './recommendations.routes.js'
import { aiExecPredictionsRoutes } from './predictions.routes.js'
import { aiExecScenariosRoutes } from './scenarios.routes.js'
import { aiExecProposalsRoutes } from './proposals.routes.js'
import { aiExecDecisionsRoutes } from './decisions.routes.js'
import { aiExecSearchRoutes } from './search.routes.js'
import { aiExecDashboardRoutes } from './dashboard.routes.js'
import { aiExecKnowledgeRoutes } from './knowledge.routes.js'

export async function aiExecRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  await app.register(aiExecDashboardRoutes, { prefix: '/dashboard' })
  await app.register(aiExecExecutivesRoutes, { prefix: '/executives' })
  await app.register(aiDigitalTwinRoutes, { prefix: '/digital-twin' })
  await app.register(aiExecReportsRoutes, { prefix: '/reports' })
  await app.register(aiExecRecommendationsRoutes, { prefix: '/recommendations' })
  await app.register(aiExecPredictionsRoutes, { prefix: '/predictions' })
  await app.register(aiExecScenariosRoutes, { prefix: '/scenarios' })
  await app.register(aiExecProposalsRoutes, { prefix: '/proposals' })
  await app.register(aiExecDecisionsRoutes, { prefix: '/decisions' })
  await app.register(aiExecSearchRoutes, { prefix: '/search' })
  await app.register(aiExecKnowledgeRoutes, { prefix: '/knowledge' })
}
