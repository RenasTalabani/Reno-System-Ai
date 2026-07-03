import { FastifyInstance } from 'fastify'
import { secretsMgmtRoutes } from './routes.js'

export async function secretsMgmtModuleRoutes(app: FastifyInstance) {
  await app.register(secretsMgmtRoutes, { prefix: '/secrets-mgmt' })
}
