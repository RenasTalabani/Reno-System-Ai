// Phase 53 — AI Document Intelligence: Module Entry

import type { FastifyInstance } from 'fastify'
import { adiRoutes } from './routes.js'

export async function adiModuleRoutes(app: FastifyInstance) {
  await app.register(adiRoutes, { prefix: '/adi' })
}
