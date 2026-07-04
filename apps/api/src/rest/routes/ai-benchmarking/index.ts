import { FastifyInstance } from 'fastify'
import { aiBenchmarkingRoutes } from './routes.js'

export async function aiBenchmarkingModuleRoutes(app: FastifyInstance) {
  await app.register(aiBenchmarkingRoutes, { prefix: '/ai-benchmarking' })
}
