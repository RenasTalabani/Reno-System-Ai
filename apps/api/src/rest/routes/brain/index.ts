import type { FastifyInstance } from 'fastify'
import { brainDashboardRoutes } from './dashboard.routes.js'
import { brainAgentRoutes } from './agents.routes.js'
import { brainChatRoutes } from './chat.routes.js'
import { brainMemoryRoutes } from './memory.routes.js'
import { brainActionRoutes } from './actions.routes.js'
import { brainProviderRoutes } from './providers.routes.js'
import { brainTemplateRoutes } from './templates.routes.js'
import { brainEvolutionRoutes } from './evolution.routes.js'
import { brainProposalsRoutes } from './proposals.routes.js'
import { brainSkillEngineRoutes } from './skill-engine.routes.js'

export async function brainRoutes(app: FastifyInstance) {
  await app.register(brainDashboardRoutes, { prefix: '/dashboard' })
  await app.register(brainAgentRoutes, { prefix: '/agents' })
  await app.register(brainChatRoutes, { prefix: '/chat' })
  await app.register(brainMemoryRoutes, { prefix: '/memory' })
  await app.register(brainActionRoutes, { prefix: '/actions' })
  await app.register(brainProviderRoutes, { prefix: '/providers' })
  await app.register(brainTemplateRoutes, { prefix: '/templates' })
  await app.register(brainEvolutionRoutes, { prefix: '' })
  await app.register(brainProposalsRoutes, { prefix: '/proposals' })
  await app.register(brainSkillEngineRoutes, { prefix: '' })
}
