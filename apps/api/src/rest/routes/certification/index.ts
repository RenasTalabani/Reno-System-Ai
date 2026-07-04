import { FastifyInstance } from 'fastify'
import { certificationRoutes } from './routes.js'

export async function certificationModuleRoutes(app: FastifyInstance) {
  await app.register(certificationRoutes, { prefix: '/certification' })
}
