import type { FastifyInstance } from 'fastify'
import { clmRoutes } from './clm.routes.js'

export async function clmModuleRoutes(app: FastifyInstance) {
  await app.register(clmRoutes, { prefix: '' })
}
