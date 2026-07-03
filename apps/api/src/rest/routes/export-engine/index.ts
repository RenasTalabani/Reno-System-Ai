import type { FastifyInstance } from 'fastify'
import { exportEngineRoutes, exportDownloadRoute } from './routes.js'

export async function exportEngineModuleRoutes(app: FastifyInstance) {
  await app.register(exportEngineRoutes, { prefix: '/export-engine' })
  await app.register(exportDownloadRoute, { prefix: '' })
}
