import type { FastifyInstance } from 'fastify'
import { aiAgentRoutes } from './agents.routes.js'

export async function aiAgentsRoutes(app: FastifyInstance) {
  await app.register(aiAgentRoutes, { prefix: '' })
}
