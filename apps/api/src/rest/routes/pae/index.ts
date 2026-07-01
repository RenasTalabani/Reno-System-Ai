// Phase 52 — AI Process Automation Engine: Module Entry

import type { FastifyInstance } from 'fastify'
import { automationRoutes } from './routes.js'

export async function paeModuleRoutes(app: FastifyInstance) {
  await app.register(automationRoutes, { prefix: '/pae' })
}
