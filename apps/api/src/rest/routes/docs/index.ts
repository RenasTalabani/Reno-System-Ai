import type { FastifyInstance } from 'fastify'
import { docDashboardRoutes } from './dashboard.routes.js'
import { docFolderRoutes } from './folders.routes.js'
import { docFileRoutes } from './files.routes.js'
import { docTemplateRoutes } from './templates.routes.js'

export async function docsRoutes(app: FastifyInstance) {
  await app.register(docDashboardRoutes, { prefix: '/dashboard' })
  await app.register(docFolderRoutes, { prefix: '/folders' })
  await app.register(docFileRoutes, { prefix: '/files' })
  await app.register(docTemplateRoutes, { prefix: '/templates' })
}
