import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { invDashboardRoutes } from './dashboard.routes.js'
import { invCategoryRoutes } from './categories.routes.js'
import { invUnitRoutes } from './units.routes.js'
import { invProductRoutes } from './products.routes.js'
import { invWarehouseRoutes } from './warehouses.routes.js'
import { invMovementRoutes } from './movements.routes.js'
import { invStockRoutes } from './stock.routes.js'
import { invReceiptRoutes } from './receipts.routes.js'
import { invTransferRoutes } from './transfers.routes.js'
import { invAdjustmentRoutes } from './adjustments.routes.js'
import { invReorderRuleRoutes } from './reorder-rules.routes.js'

export async function inventoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)
  await app.register(invDashboardRoutes, { prefix: '/dashboard' })
  await app.register(invCategoryRoutes, { prefix: '/categories' })
  await app.register(invUnitRoutes, { prefix: '/units' })
  await app.register(invProductRoutes, { prefix: '/products' })
  await app.register(invWarehouseRoutes, { prefix: '/warehouses' })
  await app.register(invMovementRoutes, { prefix: '/movements' })
  await app.register(invStockRoutes, { prefix: '/stock' })
  await app.register(invReceiptRoutes, { prefix: '/receipts' })
  await app.register(invTransferRoutes, { prefix: '/transfers' })
  await app.register(invAdjustmentRoutes, { prefix: '/adjustments' })
  await app.register(invReorderRuleRoutes, { prefix: '/reorder-rules' })
}
