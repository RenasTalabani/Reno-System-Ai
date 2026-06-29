import type { FastifyInstance } from 'fastify'
import { evsRoutes } from './evs.routes.js'

export async function evsModuleRoutes(app: FastifyInstance) {
  await app.register(evsRoutes, { prefix: '' })
}
