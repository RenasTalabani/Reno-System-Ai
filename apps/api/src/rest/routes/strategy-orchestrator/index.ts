import type { FastifyInstance } from 'fastify'
import { strategyOrchestratorRoutes } from './routes.js'

export async function strategyOrchestratorModuleRoutes(app: FastifyInstance) {
  await app.register(strategyOrchestratorRoutes, { prefix: '/strategy-orchestrator' })
}
