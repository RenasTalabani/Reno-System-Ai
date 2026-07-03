import { FastifyInstance } from 'fastify'
import { zeroTrustRoutes } from './routes.js'

export async function zeroTrustModuleRoutes(app: FastifyInstance) {
  await app.register(zeroTrustRoutes, { prefix: '/zero-trust' })
}
