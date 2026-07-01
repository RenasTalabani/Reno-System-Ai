// Phase 50 — AI Continuous Learning & Optimization Platform: Module Entry

import type { FastifyInstance } from 'fastify'
import { learningRoutes } from './routes.js'

export async function learningModuleRoutes(app: FastifyInstance) {
  await app.register(learningRoutes, { prefix: '/learning' })
}
