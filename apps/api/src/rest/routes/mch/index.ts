// Phase 54 — AI Multi-Channel Communication Hub: Module Entry

import type { FastifyInstance } from 'fastify'
import { mchRoutes } from './routes.js'

export async function mchModuleRoutes(app: FastifyInstance) {
  await app.register(mchRoutes, { prefix: '/mch' })
}
