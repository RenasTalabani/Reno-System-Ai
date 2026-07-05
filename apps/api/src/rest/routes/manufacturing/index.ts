import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { mfgDashboardRoutes } from './dashboard.routes.js'
import { mfgBomRoutes } from './bom.routes.js'
import { mfgWorkCenterRoutes } from './work-centers.routes.js'
import { mfgOrderRoutes } from './orders.routes.js'
import { mfgQualityRoutes } from './quality.routes.js'
import { mfgMrpRoutes } from './mrp.routes.js'

export async function manufacturingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  await app.register(mfgDashboardRoutes, { prefix: '/dashboard' })
  await app.register(mfgBomRoutes, { prefix: '/bom' })
  await app.register(mfgWorkCenterRoutes, { prefix: '/work-centers' })
  await app.register(mfgOrderRoutes, { prefix: '/orders' })
  await app.register(mfgQualityRoutes, { prefix: '/quality' })
  await app.register(mfgMrpRoutes, { prefix: '/mrp' })
}
