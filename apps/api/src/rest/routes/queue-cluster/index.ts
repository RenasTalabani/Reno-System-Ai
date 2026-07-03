import { FastifyInstance } from 'fastify'
import { queueClusterRoutes } from './routes.js'

export async function queueClusterModuleRoutes(app: FastifyInstance) {
  await app.register(queueClusterRoutes, { prefix: '/queue-cluster' })
}
