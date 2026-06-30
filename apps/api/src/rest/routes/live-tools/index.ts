import type { FastifyInstance } from 'fastify'
import { liveToolsRoutes } from './routes.js'

export async function liveToolsModuleRoutes(app: FastifyInstance) {
  await app.register(liveToolsRoutes, { prefix: '/live-tools' })
}
