import { FastifyInstance } from 'fastify'
import { autoScalingRoutes } from './routes.js'

export async function autoScalingModuleRoutes(app: FastifyInstance) {
  await app.register(autoScalingRoutes, { prefix: '/auto-scaling' })
}
