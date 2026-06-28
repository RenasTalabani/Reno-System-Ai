import type { FastifyInstance } from 'fastify'
import { fxRoutes } from './fx.routes.js'

export async function fxModuleRoutes(app: FastifyInstance) {
  await app.register(fxRoutes, { prefix: '' })
}
