// Phase 49 — AI Universal Action Layer: Module Entry

import type { FastifyInstance } from 'fastify'
import { actionLayerRoutes } from './routes.js'

export async function actionLayerModuleRoutes(app: FastifyInstance) {
  await app.register(actionLayerRoutes, { prefix: '/action-layer' })
}
