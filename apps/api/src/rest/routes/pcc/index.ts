// Phase 55 — AI Platform Command Center: Module Entry

import type { FastifyInstance } from 'fastify'
import { pccRoutes } from './routes.js'

export async function pccModuleRoutes(app: FastifyInstance) {
  await app.register(pccRoutes, { prefix: '/pcc' })
}
