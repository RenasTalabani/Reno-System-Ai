// Phase 51 — AI Enterprise Operating System Runtime: Module Entry

import type { FastifyInstance } from 'fastify'
import { aosRoutes } from './routes.js'

export async function aosModuleRoutes(app: FastifyInstance) {
  await app.register(aosRoutes, { prefix: '/aos' })
}
