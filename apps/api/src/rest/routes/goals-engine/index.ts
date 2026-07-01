import type { FastifyInstance } from 'fastify'
import { goalsEngineRoutes } from './routes.js'

export async function goalsEngineModuleRoutes(app: FastifyInstance) {
  await app.register(goalsEngineRoutes, { prefix: '/goals-engine' })
}
