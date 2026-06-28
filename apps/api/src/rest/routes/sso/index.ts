import type { FastifyInstance } from 'fastify'
import { ssoRoutes } from './sso.routes.js'

export async function ssoModuleRoutes(app: FastifyInstance) {
  await app.register(ssoRoutes, { prefix: '' })
}
