import { FastifyInstance } from 'fastify'
import { sdkRoutes } from './routes.js'

export async function sdkModuleRoutes(app: FastifyInstance) {
  await app.register(sdkRoutes, { prefix: '/sdk' })
}
