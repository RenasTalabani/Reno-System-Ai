import type { FastifyInstance } from 'fastify'
import { predictiveSimRoutes } from './routes.js'

export async function predictiveSimModuleRoutes(app: FastifyInstance) {
  await app.register(predictiveSimRoutes, { prefix: '/predictive-sim' })
}
